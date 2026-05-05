"use client"

import { useState } from "react"
import useSWR from "swr"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function ParserResultsTable({ taskId }: { taskId: number }) {
  const [page, setPage] = useState(1)
  
  const { data, isLoading } = useSWR(`/api/admin/parser/results?task_id=${taskId}&page=${page}`, fetcher)

  if (isLoading) return <div className="p-4 text-center">Загрузка результатов...</div>
  if (!data || !data.items || data.items.length === 0) return <div className="p-4 text-center text-muted-foreground">Нет данных</div>

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Город</TableHead>
              <TableHead>Подписчики</TableHead>
              <TableHead>Контакты</TableHead>
              <TableHead>Ссылка</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((group: any) => {
              // Parse contacts if needed
              let contactsInfo = ""
              try {
                if (group.contacts) {
                  const c = JSON.parse(group.contacts)
                  if (Array.isArray(c)) {
                    contactsInfo = c.map((cnt: any) => `${cnt.desc ? cnt.desc + ':' : ''} ${cnt.phone || ''} ${cnt.email || ''}`).join(', ')
                  }
                }
              } catch (e) {}

              return (
                <TableRow key={group.id}>
                  <TableCell className="font-medium max-w-[200px] truncate" title={group.name}>{group.name}</TableCell>
                  <TableCell>{group.city_title || '—'}</TableCell>
                  <TableCell>{group.members_count}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={contactsInfo}>{contactsInfo || '—'}</TableCell>
                  <TableCell>
                    <a 
                      href={`https://vk.com/${group.screen_name || 'club'+group.vk_group_id}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      Перейти
                    </a>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Всего найдено: {data.total}
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Назад
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(p => p + 1)}
            disabled={data.items.length < data.limit}
          >
            Вперед
          </Button>
        </div>
      </div>
    </div>
  )
}
