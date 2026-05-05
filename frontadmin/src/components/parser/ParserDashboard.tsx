"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { IconSearch, IconPlayerPlay, IconPlayerStop, IconDownload } from "@tabler/icons-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ParserResultsTable } from "./ParserResultsTable"
import { CitySelect, type City } from "./CitySelect"

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function ParserDashboard() {
  const [keywords, setKeywords] = useState("приют для животных, приют собак, приют кошек, бездомные животные, помощь бездомным, помощь животным, спасение животных, зоозащита, защита животных, волонтеры животные, потеряшки животные, потеряшки собаки, потеряшки кошки, передержка животных, передержка собак, передержка кошек, в добрые руки животные, в добрые руки собаки, в добрые руки кошки, ищут дом животные, хвостики приют, помощь хвостикам, благотворительный фонд животные, бездомыши")
  const [selectedCities, setSelectedCities] = useState<City[]>([])
  const [manualLink, setManualLink] = useState("")

  const [audienceCity, setAudienceCity] = useState<City[]>([])
  
  // Poll status every 3 seconds if running
  const { data: status, mutate: mutateStatus } = useSWR('/api/admin/parser/status', fetcher, {
    refreshInterval: (data) => (data?.status === 'running' ? 3000 : 0)
  })

  // Poll audience status every 3 seconds if running
  const { data: audienceStatus, mutate: mutateAudienceStatus } = useSWR('/api/admin/audience/status', fetcher, {
    refreshInterval: (data) => (data?.status === 'running' ? 3000 : 0)
  })

  const isAudienceRunning = audienceStatus?.status === 'running'

  const handleStartAudience = async () => {
    if (audienceCity.length === 0) {
      toast.error("Выберите город для сбора аудитории")
      return
    }

    try {
      const res = await fetch('/api/admin/audience/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city_title: audienceCity[0].title })
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Сбор аудитории запущен")
        mutateAudienceStatus()
      } else {
        toast.error(data.error || "Ошибка запуска")
      }
    } catch (e) {
      toast.error("Ошибка сети")
    }
  }

  const handleStopAudience = async () => {
    try {
      const res = await fetch('/api/admin/audience/stop', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success("Сбор аудитории остановлен")
        mutateAudienceStatus()
      }
    } catch (e) {
      toast.error("Ошибка сети")
    }
  }

  const handleStart = async () => {
    if (selectedCities.length === 0) {
      toast.error("Выберите хотя бы один город")
      return
    }

    try {
      const citiesString = selectedCities.map(c => c.id.toString()).join(", ")
      const res = await fetch('/api/admin/parser/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, cities: citiesString })
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Парсинг запущен")
        mutateStatus()
      } else {
        toast.error(data.error || "Ошибка запуска")
      }
    } catch (e) {
      toast.error("Ошибка сети")
    }
  }

  const handleStop = async () => {
    try {
      const res = await fetch('/api/admin/parser/stop', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success("Парсинг остановлен")
        mutateStatus()
      }
    } catch (e) {
      toast.error("Ошибка сети")
    }
  }

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualLink) return
    try {
      const res = await fetch('/api/admin/parser/add-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_or_id: manualLink })
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Группа успешно добавлена")
        setManualLink("")
      } else {
        toast.error("Ошибка: Группа не найдена или недоступна")
      }
    } catch (e) {
      toast.error("Ошибка сети")
    }
  }

  const handleClear = async () => {
    if (!confirm("Вы уверены, что хотите полностью очистить весь справочник? Это удалит все ранее собранные группы.")) return
    try {
      const res = await fetch('/api/admin/parser/clear', { method: 'POST' })
      if (res.ok) {
        toast.success("Справочник очищен")
        mutateStatus() // To trigger some revalidation if needed
        // Ideally we should mutate the table, but since they don't share a key easily, user will see the table update soon or can refresh
        window.location.reload()
      }
    } catch (e) {
      toast.error("Ошибка сети")
    }
  }

  const isRunning = status?.status === 'running'

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Парсер ВКонтакте</h1>
          <p className="text-muted-foreground text-sm">
            Сбор и ведение глобального справочника групп
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Настройки парсинга</CardTitle>
            <CardDescription>Укажите параметры для автоматического поиска.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keywords">Ключевые слова (через запятую)</Label>
              <Textarea 
                id="keywords" 
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="животные, приюты, ветклиники..."
                disabled={isRunning}
                className="h-24"
              />
            </div>
            <div className="space-y-2">
              <Label>Города для поиска</Label>
              <CitySelect 
                selectedCities={selectedCities}
                onChange={setSelectedCities}
                disabled={isRunning}
              />
              <p className="text-xs text-muted-foreground mt-1">Можно выбрать несколько городов. Парсер пройдет по каждому из них.</p>
            </div>
            
            <div className="flex gap-2 pt-2">
              {!isRunning ? (
                <Button onClick={handleStart} className="w-full">
                  <IconPlayerPlay className="mr-2 h-4 w-4" /> Запустить
                </Button>
              ) : (
                <Button variant="destructive" onClick={handleStop} className="w-full">
                  <IconPlayerStop className="mr-2 h-4 w-4" /> Остановить
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Статус парсера</CardTitle>
              <CardDescription>Текущее состояние</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {status ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-sm font-medium">Состояние</span>
                    <Badge variant={status.status === 'running' ? 'default' : (status.status === 'error' ? 'destructive' : 'secondary')}>
                      {status.status === 'running' ? 'В процессе' : (status.status === 'completed' ? 'Завершен' : 'Ошибка')}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-sm font-medium">Найдено групп за сессию</span>
                    <span className="font-bold text-lg">{status.total_found || 0}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-sm font-medium">Текущий город (ID)</span>
                    <span className="text-sm">{status.current_city || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Начат</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(status.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Нет активных задач
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Добавить вручную</CardTitle>
              <CardDescription>Вставьте ID группы или ссылку</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddManual} className="flex gap-2">
                <Input 
                  value={manualLink}
                  onChange={e => setManualLink(e.target.value)}
                  placeholder="https://vk.com/club123456" 
                />
                <Button type="submit" variant="secondary">Добавить</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>Сбор аудитории (Ретаргетинг)</CardTitle>
          <CardDescription>Выгрузка уникальных подписчиков из всех чистых групп города</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Выберите город для выгрузки</Label>
              <CitySelect 
                selectedCities={audienceCity}
                onChange={setAudienceCity}
                disabled={isAudienceRunning}
                maxCount={1}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Выберите один город. Парсер соберет базу ID подписчиков, отфильтруя дубликаты.
              </p>
              
              <div className="flex gap-2 pt-2">
                {!isAudienceRunning ? (
                  <Button onClick={handleStartAudience} className="w-full">
                    <IconPlayerPlay className="mr-2 h-4 w-4" /> Начать сбор
                  </Button>
                ) : (
                  <Button variant="destructive" onClick={handleStopAudience} className="w-full">
                    <IconPlayerStop className="mr-2 h-4 w-4" /> Остановить
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-muted rounded-lg p-4 flex flex-col justify-center space-y-4">
              {audienceStatus ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm border-b border-border pb-1">
                    <span>Город</span>
                    <span className="font-medium">{audienceStatus.city_title}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-border pb-1">
                    <span>Обработано групп</span>
                    <span className="font-medium">{audienceStatus.groups_processed} / {audienceStatus.groups_total}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-border pb-1">
                    <span>Всего подписчиков</span>
                    <span className="font-medium">{audienceStatus.total_members}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold border-b border-border pb-1">
                    <span>Уникальных (без дублей)</span>
                    <span className="text-primary">{audienceStatus.unique_members}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Статус</span>
                    <Badge variant={audienceStatus.status === 'running' ? 'default' : (audienceStatus.status === 'error' ? 'destructive' : 'secondary')}>
                      {audienceStatus.status === 'running' ? 'Собирается...' : (audienceStatus.status === 'completed' ? 'Завершено' : 'Ошибка')}
                    </Badge>
                  </div>
                  
                  {audienceStatus.status !== 'running' && audienceStatus.unique_members > 0 && (
                     <Button asChild variant="outline" className="w-full mt-2">
                        <a href={`/api/admin/audience/export?task_id=${audienceStatus.id}`} download={`audience_${audienceStatus.city_title}.txt`}>
                          <IconDownload className="mr-2 h-4 w-4" /> Скачать TXT базу ВК
                        </a>
                     </Button>
                  )}
                </div>
              ) : (
                 <div className="text-center text-muted-foreground text-sm">
                   Сбор еще не запускался
                 </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Справочник групп</CardTitle>
            <CardDescription>Все собранные группы (кроме черного списка)</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClear} className="text-destructive border-destructive hover:bg-destructive hover:text-white">
              Очистить базу
            </Button>
            <a 
              href={`/api/admin/parser/results?export=csv`} 
              download={`parsed_groups_master.csv`}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground text-[0.8rem] h-8 px-3 font-medium transition-all"
            >
              <IconDownload className="mr-2 h-4 w-4" /> Скачать CSV
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <ParserResultsTable />
        </CardContent>
      </Card>
    </div>
  )
}
