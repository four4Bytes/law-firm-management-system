import { prisma } from "@/lib/prisma";

interface SeedClient {
  id: string;
  name: string;
  email: string;
  address?: string;
  phone_number?: string;
}

const clients: SeedClient[] = [
  {
    id: "c0000000-0000-4000-a000-000000000001",
    name: "John Doe",
    email: "john.doe@example.com",
    address: "123 Main St, Springfield, IL",
    phone_number: "+1-555-0101",
  },
  {
    id: "c0000000-0000-4000-a000-000000000002",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    address: "456 Oak Ave, Portland, OR",
    phone_number: "+1-555-0102",
  },
  {
    id: "c0000000-0000-4000-a000-000000000003",
    name: "ABC Corporation",
    email: "abc@company.com",
    address: "100 Market St, San Francisco, CA",
    phone_number: "+1-555-0103",
  },
  {
    id: "c0000000-0000-4000-a000-000000000004",
    name: "Maria Garcia",
    email: "maria.garcia@example.com",
    phone_number: "+1-555-0104",
  },
  {
    id: "c0000000-0000-4000-a000-000000000005",
    name: "Thompson & Sons LLC",
    email: "thompson@legalfirm.com",
    address: "200 Broad St, New York, NY",
    phone_number: "+1-555-0105",
  },
  {
    id: "c0000000-0000-4000-a000-000000000006",
    name: "Robert Johnson",
    email: "robert.j@example.com",
    address: "789 Pine Rd, Austin, TX",
  },
  {
    id: "c0000000-0000-4000-a000-000000000007",
    name: "Delta Industries",
    email: "delta@company.com",
    address: "50 Industrial Dr, Detroit, MI",
    phone_number: "+1-555-0107",
  },
  {
    id: "c0000000-0000-4000-a000-000000000008",
    name: "Sarah Williams",
    email: "sarah.w@example.com",
    phone_number: "+1-555-0108",
  },
  {
    id: "c0000000-0000-4000-a000-000000000009",
    name: "Pacific Holdings",
    email: "pacific@holdings.com",
    address: "300 Harbor Blvd, Seattle, WA",
    phone_number: "+1-555-0109",
  },
  {
    id: "c0000000-0000-4000-a000-000000000010",
    name: "Michael Brown",
    email: "michael.b@example.com",
    address: "321 Elm St, Denver, CO",
    phone_number: "+1-555-0110",
  },
  {
    id: "c0000000-0000-4000-a000-000000000011",
    name: "Blue Ridge Properties",
    email: "blue.ridge@properties.com",
    address: "1500 Commerce Blvd, Dallas, TX",
    phone_number: "+1-555-0111",
  },
  {
    id: "c0000000-0000-4000-a000-000000000012",
    name: "Emily Davis",
    email: "emily.d@example.com",
    address: "654 Maple Dr, Boston, MA",
  },
  {
    id: "c0000000-0000-4000-a000-000000000013",
    name: "Summit Consulting Group",
    email: "summit@consulting.com",
    address: "500 Park Ave, Chicago, IL",
    phone_number: "+1-555-0113",
  },
  {
    id: "c0000000-0000-4000-a000-000000000014",
    name: "James Wilson",
    email: "james.w@example.com",
    address: "987 Cedar Ln, Miami, FL",
    phone_number: "+1-555-0114",
  },
  {
    id: "c0000000-0000-4000-a000-000000000015",
    name: "Evergreen Holdings",
    email: "evergreen@holdings.com",
  },
];

export async function seedClients() {
  let count = 0;

  for (const c of clients) {
    await prisma.client.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        name: c.name,
        email: c.email,
        address: c.address ?? null,
        phone_number: c.phone_number ?? null,
      },
    });
    count++;
  }

  console.log(`Seeded ${count} clients.`);
}
