import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { IconSearch } from '@tabler/icons-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AppUser {
  id: number;
  vk_user_id: number;
  first_name: string;
  last_name: string;
  photo_200: string;
  city_id: number | null;
  city_title: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export function AppUsersTable() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      let url = "/api/admin/app-users?limit=100";
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
        
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data.data || response.data;
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 pb-4">
        <div>
          <CardTitle>Список пользователей</CardTitle>
          <CardDescription>Пользователи, открывавшие ваше приложение</CardDescription>
        </div>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <Input 
            placeholder="Поиск по имени..." 
            className="w-[200px]" 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit" variant="secondary" size="icon">
            <IconSearch className="w-4 h-4" />
          </Button>
        </form>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8 text-muted-foreground">Загрузка пользователей...</div>
        ) : users.length === 0 ? (
          <div className="flex justify-center p-8 text-muted-foreground border border-dashed rounded-lg">Пользователи не найдены</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Аватар</TableHead>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>VK ID</TableHead>
                  <TableHead>Город</TableHead>
                  <TableHead>Последний визит</TableHead>
                  <TableHead>Первый визит</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Avatar>
                        <AvatarImage src={user.photo_200} alt={user.first_name} />
                        <AvatarFallback>{user.first_name?.[0]}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">
                      <a href={`https://vk.com/id${user.vk_user_id}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                        {user.first_name} {user.last_name}
                      </a>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.vk_user_id}</TableCell>
                    <TableCell>{user.city_title || <span className="text-muted-foreground">Не указан</span>}</TableCell>
                    <TableCell>
                      {format(new Date(user.updated_at), "d MMM yyyy, HH:mm", { locale: ru })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(user.created_at), "d MMM yyyy", { locale: ru })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
