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
import { IconSearch, IconBell, IconBellOff } from '@tabler/icons-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface AppUser {
  id: number;
  vk_user_id: number;
  first_name: string;
  last_name: string;
  photo_200: string;
  city_id: number | null;
  city_title: string | null;
  role: string;
  is_messages_allowed?: boolean;
  created_at: string;
  updated_at: string;
}

export function AppUsersTable() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetchUsers();
  }, [search, page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const offset = (page - 1) * limit;
      let url = `/api/admin/app-users?limit=${limit}&offset=${offset}`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
        
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const responseData = response.data.data || response.data;
      if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
        setUsers(responseData.users || []);
        setTotal(responseData.total || 0);
      } else {
        setUsers(Array.isArray(responseData) ? responseData : []);
        setTotal(Array.isArray(responseData) ? responseData.length : 0);
      }
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
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Аватар</TableHead>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Уведомления</TableHead>
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
                      <TableCell>
                        {user.is_messages_allowed ? (
                          <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 gap-1 px-2 py-0.5 whitespace-nowrap">
                            <IconBell className="w-3.5 h-3.5" />
                            Разрешены
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500 bg-gray-50 border-gray-200 gap-1 px-2 py-0.5 whitespace-nowrap">
                            <IconBellOff className="w-3.5 h-3.5" />
                            Запрещены
                          </Badge>
                        )}
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

            {total > limit && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Показано {(page - 1) * limit + 1} - {Math.min(page * limit, total)} из {total}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Назад
                  </Button>
                  <div className="text-sm font-medium px-2">{page}</div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * limit >= total}
                  >
                    Вперед
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
