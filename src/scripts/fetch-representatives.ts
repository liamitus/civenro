import "dotenv/config";
import { fetchGovTrackRoles } from "../lib/govtrack";
import { createStandalonePrisma } from "../lib/prisma-standalone";

const prisma = createStandalonePrisma();

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchRepresentativesFunction() {
  try {
    const roles = await fetchGovTrackRoles({ current: true, limit: 600 });

    for (const role of roles) {
      const person = role.person;
      const bioguideId = person.bioguideid;

      if (!bioguideId) {
        console.warn(`No bioguideId for person: ${person.name}`);
        continue;
      }

      const imageUrl = `https://theunitedstates.io/images/congress/225x275/${bioguideId}.jpg`;

      await prisma.representative.upsert({
        where: { bioguideId },
        update: {
          firstName: person.firstname,
          lastName: person.lastname,
          state: role.state,
          district: role.district ? role.district.toString() : null,
          party: role.party,
          chamber: role.role_type_label.toLowerCase(),
          imageUrl,
          link: person.link,
        },
        create: {
          bioguideId,
          firstName: person.firstname,
          lastName: person.lastname,
          state: role.state,
          district: role.district ? role.district.toString() : null,
          party: role.party,
          chamber: role.role_type_label.toLowerCase(),
          imageUrl,
          link: person.link,
        },
      });
    }
    console.log("Representatives fetched and stored successfully.");
  } catch (error: any) {
    console.error("Error fetching representatives:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

if (require.main === module) {
  fetchRepresentativesFunction();
}
