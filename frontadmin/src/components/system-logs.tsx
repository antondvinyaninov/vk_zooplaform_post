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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { IconAlertTriangle, IconInfoCircle, IconBug } from '@tabler/icons-react';

interface SystemLog {
  id: number;
  level: string;
  action: string;
  message: string;
  user_id: number | null;
  details: string;
  created_at: string;
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    photo_200: string;
  };
  group?: {
    id: number;
    name: string;
    screen_name: string;
    photo_200: string;
  };
  post?: {
    id: number;
    message: string;
  };
}

export function SystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const url = filter === "ALL" 
        ? "/api/admin/logs" 
        : `/api/admin/logs?level=${filter}`;
        
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data.data || response.data;
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'INFO':
      case 'ADMIN_LOGIN':
      case 'POST_CREATED':
      case 'GROUP_ADDED':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"><IconInfoCircle className="w-3 h-3 mr-1" /> INFO</Badge>;
      case 'WARNING':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-800"><IconAlertTriangle className="w-3 h-3 mr-1" /> WARN</Badge>;
      case 'ERROR':
      case 'HTTP_500':
        return <Badge variant="destructive"><IconBug className="w-3 h-3 mr-1" /> ERROR</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>Журнал событий</CardTitle>
          <CardDescription>Последние события системы</CardDescription>
        </div>
        <div className="w-[180px]">
          <Select value={filter} onValueChange={(val) => setFilter(val || "ALL")}>
            <SelectTrigger>
              <SelectValue placeholder="Все события" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Все события</SelectItem>
              <SelectItem value="INFO">Информация</SelectItem>
              <SelectItem value="WARNING">Предупреждения</SelectItem>
              <SelectItem value="ERROR">Ошибки</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8 text-muted-foreground">Загрузка логов...</div>
        ) : logs.length === 0 ? (
          <div className="flex justify-center p-8 text-muted-foreground border border-dashed rounded-lg">Логи не найдены</div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Время</TableHead>
                  <TableHead className="w-[120px]">Уровень</TableHead>
                  <TableHead className="w-[200px]">Действие</TableHead>
                  <TableHead>Сообщение</TableHead>
                  <TableHead className="text-right w-[200px]">Пользователь</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium text-xs whitespace-nowrap">
                      {format(new Date(log.created_at), "dd MMM yyyy, HH:mm:ss", { locale: ru })}
                    </TableCell>
                    <TableCell>{getLevelBadge(log.level)}</TableCell>
                    <TableCell className="text-sm">
                      <span className="font-semibold">{log.action}</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{log.message}</div>
                      
                      {/* Enriched Group & Post visualization */}
                      {(log.group || log.post) ? (
                        <div className="mt-2 flex flex-col gap-2">
                          {log.group && (
                            <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-md border border-border/50">
                              <img src={log.group.photo_200 || 'https://vk.com/images/community_200.png'} alt={log.group.name} className="w-8 h-8 rounded-full bg-background" />
                              <div className="flex flex-col overflow-hidden">
                                <span className="font-medium text-xs truncate" title={log.group.name}>{log.group.name}</span>
                                <span className="text-[10px] text-muted-foreground">ID: {log.group.id}</span>
                              </div>
                            </div>
                          )}
                          {log.post && (
                            <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md border border-border/50 truncate max-w-xs md:max-w-md">
                              <span className="font-semibold text-foreground mr-1">Пост #{log.post.id}:</span>
                              {log.post.message || 'Без текста'}
                            </div>
                          )}
                        </div>
                      ) : (
                        log.details && (
                          <div className="text-xs text-muted-foreground mt-1 bg-muted p-1 rounded font-mono truncate max-w-xs md:max-w-md">
                            {log.details}
                          </div>
                        )
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {log.user ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="flex flex-col text-right">
                            <span className="font-medium text-xs whitespace-nowrap">{log.user.first_name} {log.user.last_name}</span>
                            <span className="text-[10px] text-muted-foreground">ID: {log.user.id}</span>
                          </div>
                          <img src={log.user.photo_200 || 'https://vk.com/images/camera_200.png'} alt="user" className="w-8 h-8 rounded-full bg-muted" />
                        </div>
                      ) : log.user_id ? (
                        `ID: ${log.user_id}`
                      ) : (
                        <span className="text-muted-foreground">Система</span>
                      )}
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
