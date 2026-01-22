import { Table } from "@/components/tables/table";
import db from "@/lib/db";
import { format } from "date-fns";
import { BriefcaseBusiness } from "lucide-react";
import React from "react";

export const dynamic = 'force-dynamic';

const columns = [
  {
    header: "user ID",
    key: "id",
    className: "hidden lg:table-cell",
  },
  {
    header: "Name",
    key: "name",
  },
  {
    header: "Email",
    key: "email",
    className: "hidden md:table-cell",
  },
  {
    header: "Role",
    key: "role",
  },
  {
    header: "Status",
    key: "status",
  },
  {
    header: "Last Login",
    key: "last_login",
    className: "hidden xl:table-cell",
  },
];

interface UserProps {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
const UserPage = async () => {
  // Fetch users from database using Prisma
  const users = await db.user.findMany({
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      role: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!users || users.length === 0) {
    return (
      <div className="p-4">
        <p className="text-gray-600">No users found.</p>
      </div>
    );
  }

  const data = users.map((user) => ({
    id: user.id,
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  }));

  const renderRow = (item: UserProps) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-base hover:bg-slate-50"
    >
      <td className="hidden lg:table-cell items-center">{item?.id}</td>
      <td className="table-cell py-2 xl:py-4">
        {item?.firstName} {item?.lastName}
      </td>
      <td className="hidden md:table-cell">{item?.email}</td>
      <td className="table-cell capitalize">{item?.role}</td>
      <td className="hidden md:table-cell capitalize">{item?.status}</td>
      <td className="hidden xl:table-cell capitalize">
        {format(item?.updatedAt, "yyyy-MM-dd h:mm:ss")}
      </td>
    </tr>
  );
  return (
    <div className="bg-white rounded-xl p-2 md:p-4 2xl:p-6">
      <div className="flex items-center justify-between">
        <div className="hidden lg:flex items-center gap-1">
          <BriefcaseBusiness size={20} className="text-gray-500" />

          <p className="text-2xl font-semibold">{data.length}</p>
          <span className="text-gray-600 text-sm xl:text-base">
            total users
          </span>
        </div>
      </div>

      <div>
        <Table columns={columns} data={data} renderRow={renderRow} />
      </div>
    </div>
  );
};

export default UserPage;
