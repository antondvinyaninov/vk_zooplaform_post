"use client"

import * as React from "react"
import useSWR from "swr"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconUserPlus, IconDotsVertical, IconCheck, IconSettings } from "@tabler/icons-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { fetcher, api } from "@/lib/api"

interface AdminUser {
  id: number
  username: string
  display_name: string
  role: string
  status: string
  avatar_url?: string
}

interface UsersResponse {
  users: AdminUser[]
}

const roleLabels: Record<string, string> = {
  admin: "Администратор",
  moderator: "Модератор",
  user: "Сотрудник",
}

export function UsersManagementCard() {
  const { data, error, isLoading, mutate } = useSWR<UsersResponse>("/admin/users", fetcher)

  const users = data?.users || []

  const handleRoleChange = async (userId: number, role: string) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role })
      mutate()
    } catch (err) {
      console.error("Failed to update role", err)
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0 pb-6">
        <div>
          <CardTitle>Управление пользователями</CardTitle>
          <CardDescription className="mt-1">
            Добавление пользователей в команду и назначение ролей доступа.
          </CardDescription>
        </div>
        <Button disabled>
          <IconUserPlus className="mr-2 size-4" />
          Пригласить
        </Button>
      </CardHeader>
      <CardContent>
        {/* Desktop Table */}
        <div className="max-md:hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead>Логин</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-[100px] text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-8 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="size-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-destructive">
                    Ошибка загрузки пользователей
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Пользователи не найдены
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage src={user.avatar_url || ""} />
                          <AvatarFallback>{(user.display_name || user.username).substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.display_name || user.username}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.username}</TableCell>
                    <TableCell>{roleLabels[user.role] || user.role}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === "active" ? "secondary" : "outline"} className={user.status === "active" ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/20" : ""}>
                        {user.status === "active" ? "Активен" : user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
                          <IconDotsVertical className="size-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Изменить роль</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {["admin", "moderator", "user"].map((role) => (
                            <DropdownMenuItem key={role} onClick={() => handleRoleChange(user.id, role)}>
                              <div className="flex items-center w-full">
                                {roleLabels[role]}
                                {user.role === role && <IconCheck className="ml-auto size-4" />}
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="hidden max-md:flex flex-col gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4">
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))
          ) : error ? (
            <div className="text-center p-4 text-destructive border rounded-lg">Ошибка загрузки пользователей</div>
          ) : users.map((user) => (
            <div key={user.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarImage src={user.avatar_url || ""} />
                    <AvatarFallback>{(user.display_name || user.username).substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{user.display_name || user.username}</div>
                    <div className="text-sm text-muted-foreground">{user.username}</div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8 shrink-0" />}>
                    <IconDotsVertical className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Изменить роль</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {["admin", "moderator", "user"].map((role) => (
                      <DropdownMenuItem key={role} onClick={() => handleRoleChange(user.id, role)}>
                        {roleLabels[role]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1 text-xs">Роль</div>
                  <div>{roleLabels[user.role] || user.role}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1 text-xs">Статус</div>
                  <Badge variant={user.status === "active" ? "secondary" : "outline"} className={user.status === "active" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : ""}>
                    {user.status === "active" ? "Активен" : user.status}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
