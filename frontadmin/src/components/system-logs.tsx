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
    vk_group_id?: number;
    name: string;
    screen_name: string;
    photo_200: string;
  };
  post?: {
    id: number;
    vk_post_id?: number;
    vk_group_id?: number;
    message: string;
  };
}

const MEDIA_DETAIL_LABELS = [
  "Post ID",
  "Group ID",
  "VK Post ID",
  "Attempts",
  "Expected",
  "Uploaded",
  "Missing S3 keys",
  "Failures",
  "Expected attachments",
  "Actual attachments",
  "Missing attachments",
  "Remaining S3 keys",
  "Added attachments",
  "Published attachments",
  "Attachments",
  "Error",
];

const MEDIA_DETAIL_FIELDS: Array<[string, string]> = [
  ["Failures", "Сбой при загрузке"],
  ["Error", "Ошибка"],
  ["Missing attachments", "Не найдено на стене"],
  ["Missing S3 keys", "Не найдено в S3"],
  ["Remaining S3 keys", "Осталось в S3"],
  ["Attempts", "Попытки проверки"],
  ["Expected attachments", "Ожидали на стене"],
  ["Actual attachments", "Фактически на стене"],
  ["Added attachments", "Добавили"],
  ["Published attachments", "Опубликованные вложения"],
  ["Expected", "Ожидали загрузить"],
  ["Uploaded", "Загрузили"],
  ["Attachments", "Вложения"],
  ["VK Post ID", "VK post_id"],
  ["Post ID", "Внутренний post_id"],
  ["Group ID", "group_id"],
];

const MEDIA_ACTION_HINTS: Record<string, string> = {
  MEDIA_PARTIAL_UPLOAD: "часть файлов не загрузилась в VK",
  MEDIA_VERIFY_FAILED: "не удалось проверить пост на стене VK",
  MEDIA_VERIFY_MISSING: "VK опубликовал пост без части вложений",
  MEDIA_VERIFY_REPAIR_FAILED: "не удалось восстановить вложения через wall.edit",
  MEDIA_VERIFY_REPAIR_CHECK_FAILED: "не удалось проверить результат восстановления",
  MEDIA_VERIFY_REPAIR_INCOMPLETE: "после wall.edit часть вложений всё ещё отсутствует",
  MEDIA_VERIFY_REPAIR_SUCCESS: "вложения восстановлены через wall.edit",
  MEDIA_VERIFY_PARTIAL_OK: "часть вложений не загрузилась, но опубликованные вложения проверены",
  MEDIA_VERIFY_OK: "вложения проверены на стене VK",
  MEDIA_PATCH_FAILED: "не удалось дозагрузить медиа из S3",
  MEDIA_PATCH_WALL_EDIT_FAILED: "не удалось добавить дозагруженные медиа через wall.edit",
  MEDIA_PATCH_VERIFY_FAILED: "не удалось проверить результат дозагрузки",
  MEDIA_PATCH_INCOMPLETE: "после дозагрузки часть вложений всё ещё отсутствует",
  MEDIA_PATCH_SUCCESS: "медиа дозагружены и проверены",
};

const MEDIA_SUCCESS_ACTIONS = new Set([
  "MEDIA_VERIFY_OK",
  "MEDIA_VERIFY_PARTIAL_OK",
  "MEDIA_VERIFY_REPAIR_SUCCESS",
  "MEDIA_PATCH_SUCCESS",
]);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isMediaDiagnostic = (action: string) => action.startsWith("MEDIA_");

const isSuccessfulMediaDiagnostic = (action: string) => MEDIA_SUCCESS_ACTIONS.has(action);

const parseMediaDetails = (details: string) => {
  const labelPattern = MEDIA_DETAIL_LABELS.map(escapeRegExp).join("|");

  return MEDIA_DETAIL_FIELDS.reduce<Record<string, string>>((acc, [key]) => {
    const keyPattern = escapeRegExp(key);
    const match = details.match(new RegExp(`${keyPattern}:\\s*(.*?)(?=,\\s*(?:${labelPattern}):|$)`));

    if (match?.[1]) {
      acc[key] = match[1].trim();
    }

    return acc;
  }, {});
};

const countListItems = (value?: string) => {
  if (!value) {
    return 0;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean).length;
};

const formatMediaCount = (count: number) => {
  if (!count) {
    return "";
  }
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 === 1 && mod100 !== 11
    ? "вложение"
    : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
      ? "вложения"
      : "вложений";
  return `${count} ${word}`;
};

const formatAttemptCount = (value?: string) => {
  const count = Number(value || 0);
  if (!count) {
    return "";
  }
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 === 1 && mod100 !== 11
    ? "попытка"
    : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
      ? "попытки"
      : "попыток";
  return `${count} ${word}`;
};

const getVKPostUrl = (log: SystemLog, parsedDetails: Record<string, string>) => {
  const vkPostID = Number(parsedDetails["VK Post ID"] || log.post?.vk_post_id || 0);
  const vkGroupID = Number(log.post?.vk_group_id || log.group?.vk_group_id || 0);

  if (!vkPostID || !vkGroupID) {
    return "";
  }

  return `https://vk.com/wall-${vkGroupID}_${vkPostID}`;
};

function MediaDiagnostics({ log }: { log: SystemLog }) {
  if (!log.details || !isMediaDiagnostic(log.action)) {
    return null;
  }

  const parsedDetails = parseMediaDetails(log.details);
  const isSuccess = isSuccessfulMediaDiagnostic(log.action);
  const attachmentsCount = countListItems(parsedDetails["Attachments"] || parsedDetails["Published attachments"] || parsedDetails["Added attachments"]);
  const vkPostUrl = getVKPostUrl(log, parsedDetails);
  const successFields: Array<{ key: string; label: string; value: string }> = [
    { key: "Attempts", label: "Попытки проверки", value: parsedDetails["Attempts"] },
    { key: "attachments_count", label: "Вложений проверено", value: attachmentsCount ? String(attachmentsCount) : "" },
    { key: "VK Post ID", label: "VK post_id", value: parsedDetails["VK Post ID"] },
    { key: "Post ID", label: "Внутренний post_id", value: parsedDetails["Post ID"] },
  ].filter((field) => field.value);
  const diagnosticFields = MEDIA_DETAIL_FIELDS
    .filter(([key]) => !isSuccess || !["Attachments", "Published attachments", "Added attachments"].includes(key))
    .map(([key, label]) => ({ key, label, value: parsedDetails[key] }))
    .filter((field) => field.value);
  const visibleFields = isSuccess ? successFields : diagnosticFields;
  const toneClassName = isSuccess
    ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/30"
    : "border-amber-200 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/30";
  const badgeClassName = isSuccess
    ? "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
    : "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200";
  const hintClassName = isSuccess
    ? "text-emerald-900 dark:text-emerald-200"
    : "text-amber-900 dark:text-amber-200";

  if (isSuccess) {
    const mediaCountText = formatMediaCount(attachmentsCount);
    const attemptCountText = formatAttemptCount(parsedDetails["Attempts"]);

    return (
      <div className={`mt-2 max-w-full rounded-md border px-2 py-1.5 text-xs ${toneClassName}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Badge variant="outline" className={badgeClassName}>
            Медиа проверено
          </Badge>
          {mediaCountText && <span className={hintClassName}>{mediaCountText}</span>}
          {attemptCountText && <span className="text-muted-foreground">{attemptCountText}</span>}
          {vkPostUrl && (
            <a
              href={vkPostUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-200"
            >
              Открыть пост
            </a>
          )}
          <details className="min-w-full">
            <summary className="cursor-pointer rounded py-0.5 text-[11px] font-medium text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Технические детали
            </summary>
            <pre className="mt-1 max-w-full whitespace-pre-wrap break-all rounded bg-background/80 p-2 font-mono text-[11px] text-muted-foreground">
              {log.details}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-2 max-w-full rounded-md border p-2 text-xs ${toneClassName}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={badgeClassName}>
          {isSuccess ? "Медиа проверено" : "Диагностика медиа"}
        </Badge>
        {MEDIA_ACTION_HINTS[log.action] && (
          <span className={hintClassName}>{MEDIA_ACTION_HINTS[log.action]}</span>
        )}
      </div>

      {visibleFields.length > 0 && (
        <div className="grid min-w-0 gap-2 md:grid-cols-2">
          {visibleFields.map((field) => (
            <div key={field.key} className="min-w-0 rounded border border-border/60 bg-background/80 p-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{field.label}</div>
              <div className="mt-1 break-all font-mono text-[11px] text-foreground">{field.value}</div>
            </div>
          ))}
        </div>
      )}

      <details className="mt-2">
        <summary className="cursor-pointer rounded px-1 py-0.5 text-[11px] font-medium text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Технические детали полностью
        </summary>
        <pre className="mt-1 max-w-full whitespace-pre-wrap break-all rounded bg-background/80 p-2 font-mono text-[11px] text-muted-foreground">
          {log.details}
        </pre>
      </details>
    </div>
  );
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
                      {(log.group || log.post) && (
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
                      )}
                      {log.details && isMediaDiagnostic(log.action) ? (
                        <MediaDiagnostics log={log} />
                      ) : (
                        log.details && !(log.group || log.post) && (
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
