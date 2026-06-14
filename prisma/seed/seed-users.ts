import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

interface SeedUser {
  name: string;
  email: string;
  role: Role;
  is_active?: boolean;
}

const users: SeedUser[] = [
  { name: "Dev Admin", email: "dev@lawfirm.com", role: Role.Dev },
  { name: "Admin One", email: "admin1@lawfirm.com", role: Role.Admin },
  { name: "Admin Two", email: "admin2@lawfirm.com", role: Role.Admin },
  { name: "Admin Three", email: "admin3@lawfirm.com", role: Role.Admin },
  { name: "Admin Four", email: "admin4@lawfirm.com", role: Role.Admin },
  { name: "Admin Five", email: "admin5@lawfirm.com", role: Role.Admin },
  { name: "Branch Manager A", email: "bm.a@lawfirm.com", role: Role.BranchManager },
  { name: "Branch Manager B", email: "bm.b@lawfirm.com", role: Role.BranchManager },
  { name: "Branch Manager C", email: "bm.c@lawfirm.com", role: Role.BranchManager },
  { name: "Branch Manager D", email: "bm.d@lawfirm.com", role: Role.BranchManager },
  { name: "Branch Manager E", email: "bm.e@lawfirm.com", role: Role.BranchManager },
  { name: "Alice Lawyer", email: "alice@lawfirm.com", role: Role.Lawyer },
  { name: "Bob Lawyer", email: "bob@lawfirm.com", role: Role.Lawyer },
  { name: "Carol Lawyer", email: "carol@lawfirm.com", role: Role.Lawyer },
  { name: "Dan Lawyer", email: "dan@lawfirm.com", role: Role.Lawyer },
  { name: "Eve Lawyer", email: "eve@lawfirm.com", role: Role.Lawyer },
  { name: "Frank Lawyer", email: "frank@lawfirm.com", role: Role.Lawyer },
  { name: "Grace Lawyer", email: "grace.lawyer@lawfirm.com", role: Role.Lawyer },
  { name: "Henry Lawyer", email: "henry@lawfirm.com", role: Role.Lawyer },
  { name: "Iris Lawyer", email: "iris@lawfirm.com", role: Role.Lawyer },
  { name: "Jack Lawyer", email: "jack.lawyer@lawfirm.com", role: Role.Lawyer },
  { name: "Kate Lawyer", email: "kate@lawfirm.com", role: Role.Lawyer },
  { name: "Luna Lawyer", email: "luna@lawfirm.com", role: Role.Lawyer },
  { name: "Mason Lawyer", email: "mason@lawfirm.com", role: Role.Lawyer },
  { name: "Nora Lawyer", email: "nora@lawfirm.com", role: Role.Lawyer },
  { name: "Owen Lawyer", email: "owen@lawfirm.com", role: Role.Lawyer },
  { name: "Paula Lawyer", email: "paula@lawfirm.com", role: Role.Lawyer },
  { name: "Quinn Lawyer", email: "quinn@lawfirm.com", role: Role.Lawyer },
  { name: "Rita Lawyer", email: "rita@lawfirm.com", role: Role.Lawyer },
  { name: "Sam Lawyer", email: "sam@lawfirm.com", role: Role.Lawyer },
  { name: "Tina Lawyer", email: "tina@lawfirm.com", role: Role.Lawyer },
  { name: "Uma Lawyer", email: "uma@lawfirm.com", role: Role.Lawyer },
  { name: "Victor Lawyer", email: "victor@lawfirm.com", role: Role.Lawyer },
  { name: "Wendy Lawyer", email: "wendy@lawfirm.com", role: Role.Lawyer },
  { name: "Grace Paralegal", email: "grace@lawfirm.com", role: Role.Paralegal },
  { name: "Hank Paralegal", email: "hank@lawfirm.com", role: Role.Paralegal },
  { name: "Ivy Paralegal", email: "ivy@lawfirm.com", role: Role.Paralegal },
  { name: "Leo Paralegal", email: "leo@lawfirm.com", role: Role.Paralegal },
  { name: "Mia Paralegal", email: "mia@lawfirm.com", role: Role.Paralegal },
  { name: "Noah Paralegal", email: "noah@lawfirm.com", role: Role.Paralegal },
  { name: "Opal Paralegal", email: "opal@lawfirm.com", role: Role.Paralegal },
  { name: "Pete Paralegal", email: "pete@lawfirm.com", role: Role.Paralegal },
  { name: "Jill Server", email: "jill@lawfirm.com", role: Role.ProcessServer },
  { name: "Kara Server", email: "kara@lawfirm.com", role: Role.ProcessServer },
  { name: "Liam Server", email: "liam@lawfirm.com", role: Role.ProcessServer },
  { name: "Olivia Server", email: "olivia@lawfirm.com", role: Role.ProcessServer },
  { name: "Nate Server", email: "nate@lawfirm.com", role: Role.ProcessServer },
  { name: "Vera Server", email: "vera@lawfirm.com", role: Role.ProcessServer },
  { name: "Wade Server", email: "wade@lawfirm.com", role: Role.ProcessServer },
  { name: "Xena Server", email: "xena@lawfirm.com", role: Role.ProcessServer },
  { name: "Yuri Server", email: "yuri@lawfirm.com", role: Role.ProcessServer },
  { name: "Zara Server", email: "zara@lawfirm.com", role: Role.ProcessServer },
  { name: "Aaron Server", email: "aaron@lawfirm.com", role: Role.ProcessServer },
  { name: "Bella Server", email: "bella@lawfirm.com", role: Role.ProcessServer },
  { name: "Cody Server", email: "cody@lawfirm.com", role: Role.ProcessServer },
  { name: "Diana Server", email: "diana@lawfirm.com", role: Role.ProcessServer },
];

const inactiveUsers: SeedUser[] = [
  { name: "Inactive User", email: "inactive@lawfirm.com", role: Role.Paralegal, is_active: false },
  { name: "Former Employee", email: "former@lawfirm.com", role: Role.Lawyer, is_active: false },
  { name: "Suspended Admin", email: "suspended@lawfirm.com", role: Role.Admin, is_active: false },
  {
    name: "Deactivated Server",
    email: "deactivated@lawfirm.com",
    role: Role.ProcessServer,
    is_active: false,
  },
];

export async function seedUsers() {
  const allUsers = [...users, ...inactiveUsers];
  let count = 0;

  for (const u of allUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        role: u.role,
        is_active: u.is_active ?? true,
      },
    });
    count++;
  }

  console.log(`Seeded ${count} users.`);
}
