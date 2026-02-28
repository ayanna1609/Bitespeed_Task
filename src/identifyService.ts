import { PrismaClient, Contact } from "@prisma/client";

const prisma = new PrismaClient();

export interface IdentifyRequest {
    email?: string | null;
    phoneNumber?: string | null;
}

export interface IdentifyResponse {
    contact: {
        primaryContatctId: number;
        emails: string[];
        phoneNumbers: string[];
        secondaryContactIds: number[];
    };
}

export async function identifyContact(
    req: IdentifyRequest
): Promise<IdentifyResponse> {
    const { email, phoneNumber } = req;

    // Validate - at least one of email or phoneNumber must be provided
    if (!email && !phoneNumber) {
        throw new Error("At least one of email or phoneNumber must be provided");
    }

    // Step 1: Find all contacts that directly match by email OR phoneNumber
    const orConditions: object[] = [];
    if (email) orConditions.push({ email });
    if (phoneNumber) orConditions.push({ phoneNumber });

    const matchingContacts = await prisma.contact.findMany({
        where: {
            deletedAt: null,
            OR: orConditions,
        },
    });

    // Case: No existing contacts — create a new primary contact
    if (matchingContacts.length === 0) {
        const newContact = await prisma.contact.create({
            data: {
                email: email ?? null,
                phoneNumber: phoneNumber ?? null,
                linkPrecedence: "primary",
                linkedId: null,
            },
        });

        return buildResponse(newContact.id, [newContact], []);
    }

    // Step 2: Resolve all matching contacts to their root primary IDs.
    //         A contact's root primary is either itself (if primary) or its linkedId.
    //         Since we enforce that secondaries always point to a primary, one hop is enough.
    //         But to be safe, collect all IDs referenced and re-fetch once.
    const referencedIds = new Set<number>();
    for (const contact of matchingContacts) {
        if (contact.linkPrecedence === "primary") {
            referencedIds.add(contact.id);
        } else if (contact.linkedId !== null) {
            referencedIds.add(contact.linkedId);
        } else {
            // Orphaned secondary — treat it as a primary group by its own id
            referencedIds.add(contact.id);
        }
    }

    // Step 3: Fetch ALL contacts belonging to all referenced primary groups
    const allGroupContacts = await prisma.contact.findMany({
        where: {
            deletedAt: null,
            OR: [
                { id: { in: Array.from(referencedIds) } },
                { linkedId: { in: Array.from(referencedIds) } },
            ],
        },
        orderBy: { createdAt: "asc" },
    });

    // Step 4: Determine the TRUE primary (oldest createdAt among all primaries in the merged set)
    const primaries = allGroupContacts.filter(
        (c) => c.linkPrecedence === "primary"
    );

    // Sort primaries by createdAt ascending → oldest wins
    primaries.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const truePrimary = primaries[0];

    // Step 5: If there are multiple primaries, demote all newer ones to secondary
    if (primaries.length > 1) {
        const todemote = primaries.slice(1); // all except the oldest (true primary)
        const demoteIds = todemote.map((c) => c.id);

        // Demote the newer primaries to secondary
        await prisma.contact.updateMany({
            where: { id: { in: demoteIds } },
            data: {
                linkPrecedence: "secondary",
                linkedId: truePrimary.id,
                updatedAt: new Date(),
            },
        });

        // Re-link any secondaries that were pointing to a demoted primary
        await prisma.contact.updateMany({
            where: {
                linkedId: { in: demoteIds },
                deletedAt: null,
            },
            data: {
                linkedId: truePrimary.id,
                updatedAt: new Date(),
            },
        });
    }

    // Step 6: Re-fetch the final merged group after any demotions
    const mergedGroup = await prisma.contact.findMany({
        where: {
            deletedAt: null,
            OR: [{ id: truePrimary.id }, { linkedId: truePrimary.id }],
        },
        orderBy: { createdAt: "asc" },
    });

    // Step 7: Check if the incoming request carries NEW information not in the group
    const existingEmails = new Set(
        mergedGroup.map((c) => c.email).filter((e): e is string => e !== null)
    );
    const existingPhones = new Set(
        mergedGroup.map((c) => c.phoneNumber).filter((p): p is string => p !== null)
    );

    const isNewEmail = email ? !existingEmails.has(email) : false;
    const isNewPhone = phoneNumber ? !existingPhones.has(phoneNumber) : false;

    if (isNewEmail || isNewPhone) {
        // Create a secondary contact with the new info
        await prisma.contact.create({
            data: {
                email: email ?? null,
                phoneNumber: phoneNumber ?? null,
                linkedId: truePrimary.id,
                linkPrecedence: "secondary",
            },
        });

        // Re-fetch after insert
        const updatedGroup = await prisma.contact.findMany({
            where: {
                deletedAt: null,
                OR: [{ id: truePrimary.id }, { linkedId: truePrimary.id }],
            },
            orderBy: { createdAt: "asc" },
        });

        return buildGroupResponse(truePrimary.id, updatedGroup);
    }

    return buildGroupResponse(truePrimary.id, mergedGroup);
}

function buildGroupResponse(
    primaryId: number,
    group: Contact[]
): IdentifyResponse {
    const primary = group.find((c) => c.id === primaryId)!;
    const secondaries = group.filter((c) => c.id !== primaryId);
    return buildResponse(primaryId, [primary, ...secondaries], secondaries);
}

function buildResponse(
    primaryId: number,
    allContacts: Contact[],
    secondaries: Contact[]
): IdentifyResponse {
    const primary = allContacts.find((c) => c.id === primaryId)!;
    const emailSet = new Set<string>();
    const phoneSet = new Set<string>();

    // Primary's values go first
    if (primary.email) emailSet.add(primary.email);
    if (primary.phoneNumber) phoneSet.add(primary.phoneNumber);

    // Then the rest (insertion order preserves primary-first)
    for (const c of allContacts) {
        if (c.email) emailSet.add(c.email);
        if (c.phoneNumber) phoneSet.add(c.phoneNumber);
    }

    return {
        contact: {
            primaryContatctId: primaryId,
            emails: Array.from(emailSet),
            phoneNumbers: Array.from(phoneSet),
            secondaryContactIds: secondaries.map((c) => c.id),
        },
    };
}

export { prisma };
