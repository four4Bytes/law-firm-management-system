import { prisma } from "@/lib/prisma";

interface SeedClient {
  name: string;
  email: string;
  address: string;
  phone: string;
}

const clients: SeedClient[] = [
  {
    name: "Juan M. Dela Cruz",
    email: "juan.delacruz@email.com",
    address: "123 Rizal St., Brgy. Poblacion, Makati City",
    phone: "09171234567",
  },
  {
    name: "Maria G. Gonzales",
    email: "maria.gonzales@email.com",
    address: "45 Mabini Ave., Unit 12, Quezon City",
    phone: "09182345678",
  },
  {
    name: "Carlos M. Reyes",
    email: "carlos.reyes@email.com",
    address: "7th Floor, Reyes Tower, Ayala Ave., Makati City",
    phone: "09173456789",
  },
  {
    name: "Elena V. Rodriguez",
    email: "elena.rodriguez@email.com",
    address: "89 Sampaguita Village, Las Piñas City",
    phone: "09184567890",
  },
  {
    name: "Antonio S. Lopez",
    email: "antonio.lopez@email.com",
    address: "234 Commerce Ave., Pasig City",
    phone: "09175678901",
  },
  {
    name: "Fatima D. Alcantara",
    email: "fatima.alcantara@email.com",
    address: "567 Katipunan Ext., Loyola Heights, Quezon City",
    phone: "09186789012",
  },
  {
    name: "Miguel B. Navarro",
    email: "miguel.navarro@email.com",
    address: "Unit 1501 Skyline Condo, BGC, Taguig City",
    phone: "09177890123",
  },
  {
    name: "Sofia D. Ramirez",
    email: "sofia.ramirez@email.com",
    address: "890 Maginhawa St., Diliman, Quezon City",
    phone: "09188901234",
  },
  {
    name: "Roberto S. Hernandez",
    email: "roberto.hernandez@email.com",
    address: "1234 Rizal Ave., Sta. Mesa, Manila",
    phone: "09179012345",
  },
  {
    name: "Catherine P. Santos",
    email: "catherine.santos@email.com",
    address: "56 Banawe St., Quezon City",
    phone: "09180123456",
  },
  {
    name: "Eduardo L. Villanueva",
    email: "eduardo.villanueva@email.com",
    address: "78 Pioneer St., Mandaluyong City",
    phone: "09171234568",
  },
  {
    name: "Lily M. Castillo",
    email: "lily.castillo@email.com",
    address: "90 N. Domingo St., San Juan City",
    phone: "09182345679",
  },
  {
    name: "Kristine B. Aguilar",
    email: "kristine.aguilar@email.com",
    address: "234 Aurora Blvd., Cubao, Quezon City",
    phone: "09173456780",
  },
  {
    name: "Danilo S. Fernandez",
    email: "danilo.fernandez@email.com",
    address: "567 Taft Ave., Malate, Manila",
    phone: "09184567891",
  },
  {
    name: "Patricia M. Luna",
    email: "patricia.luna@email.com",
    address: "890 Shaw Blvd., Brgy. Wack-Wack, Mandaluyong City",
    phone: "09175678902",
  },
  {
    name: "Gregorio T. Santiago",
    email: "gregorio.santiago@email.com",
    address: "123 P. Burgos St., Calamba, Laguna",
    phone: "09186789013",
  },
  {
    name: "Mercedes P. Alvarez",
    email: "mercedes.alvarez@email.com",
    address: "456 Gov. Drive, Carmona, Cavite",
    phone: "09177890124",
  },
  {
    name: "Victorino C. Rivera",
    email: "victorino.rivera@email.com",
    address: "789 Rizal St., Iloilo City",
    phone: "09188901235",
  },
  {
    name: "Jean M. Garcia",
    email: "jean.garcia@email.com",
    address: "321 Mabini St., Davao City",
    phone: "09179012346",
  },
  {
    name: "Hernando Q. Cruz",
    email: "hernando.cruz@email.com",
    address: "654 Quirino Ave., Bacoor, Cavite",
    phone: "09180123457",
  },
  {
    name: "Rowena T. Lim",
    email: "rowena.lim@email.com",
    address: "987 Chino Roces Ave., Makati City",
    phone: "09171234569",
  },
  {
    name: "Emmanuel D. Velasco",
    email: "emmanuel.velasco@email.com",
    address: "147 B. Gonzales St., Loyola Heights, Quezon City",
    phone: "09182345680",
  },
  {
    name: "Carmela S. Torres",
    email: "carmela.torres@email.com",
    address: "258 Katipunan Ave., White Plains, Quezon City",
    phone: "09173456781",
  },
  {
    name: "Luisito P. Ramos",
    email: "luisito.ramos@email.com",
    address: "369 E. Rodriguez Ave., Pasig City",
    phone: "09184567892",
  },
  {
    name: "Aileen M. Castro",
    email: "aileen.castro@email.com",
    address: "741 Shaw Blvd., Greenfield, Mandaluyong City",
    phone: "09175678903",
  },
  {
    name: "Jose R. Mercado",
    email: "jose.mercado@email.com",
    address: "159 C. Palanca St., Legazpi Village, Makati City",
    phone: "09171234570",
  },
  {
    name: "Diana F. Navarro",
    email: "diana.navarro@email.com",
    address: "753 West Ave., Brgy. West Triangle, Quezon City",
    phone: "09182345681",
  },
];

export async function seedClients(): Promise<{ id: string; email: string }[]> {
  const created: { id: string; email: string }[] = [];

  for (const c of clients) {
    const client = await prisma.client.create({
      data: {
        name: c.name,
        email: c.email,
        address: c.address,
        phone_number: c.phone,
      },
    });
    created.push({ id: client.id, email: c.email });
  }

  console.log(`Seeded ${created.length} clients.`);
  return created;
}
