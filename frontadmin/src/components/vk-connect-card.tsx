"use client"

import * as React from "react"
import useSWR from "swr"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { IconAlertTriangle, IconLink, IconTrash, IconKey, IconPlus, IconLoader2 } from "@tabler/icons-react"
import { fetcher, api } from "@/lib/api"

interface VkAccount {
  id: number
  vk_user_id?: number
  user_name?: string
  user_photo?: string
  has_token: boolean
  token_expires?: number
  is_active: boolean
  updated_at?: string
}

interface VkConnectionsResponse {
  is_connected: boolean
  has_token: boolean
  vk_user_id?: number
  user_name?: string
  user_photo?: string
  token_expires?: number
  updated_at?: string
  active_account_id?: number
  accounts: VkAccount[]
}

const VK_APP_ID = "2685278"

export function VkConnectCard() {
  const [isTokenSheetOpen, setIsTokenSheetOpen] = React.useState(false)
  const [tokenInput, setTokenInput] = React.useState("")
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState("")

  const { data, error, isLoading, mutate } = useSWR<VkConnectionsResponse>("/admin/vk/connection", fetcher)

  const accounts = data?.accounts || []

  const handleOpenAuth = () => {
    const authUrl = `https://oauth.vk.com/authorize?client_id=${VK_APP_ID}&scope=wall,photos,video,groups,offline&redirect_uri=https://oauth.vk.com/blank.html&display=page&response_type=token`
    window.open(authUrl, "vk_auth", "width=800,height=600")
  }

  const handleSaveToken = async () => {
    setErrorMsg("")
    const url = tokenInput.trim()
    
    if (!url) {
      setErrorMsg("Вставьте URL")
      return
    }
    
    const match = url.match(/access_token=([^&]+)/)
    if (!match) {
      setErrorMsg("Неверный формат URL. Токен не найден.")
      return
    }
    
    const accessToken = match[1]
    const userIdMatch = url.match(/user_id=([^&]+)/)
    const userId = userIdMatch ? parseInt(userIdMatch[1], 10) : 0
    const tokenExpires = Date.now() + (365 * 24 * 60 * 60 * 1000)

    setIsProcessing(true)
    try {
      let userName = "VK User"
      let userPhoto = ""

      // Fetch user info from backend if possible, or just save generic if not available
      if (userId) {
        try {
          const res = await api.post("/vk/user-info", {
            access_token: accessToken,
            user_id: userId,
            user_id_raw: String(userId),
          })
          if (res.data?.user) {
            userName = `${res.data.user.first_name} ${res.data.user.last_name}`
            userPhoto = res.data.user.photo_200 || ""
          }
        } catch (e) {
          console.warn("Failed to fetch user info via backend, saving with generic info", e)
        }
      }

      await api.post("/admin/vk/connection", {
        access_token: accessToken,
        vk_user_id: userId,
        user_name: userName,
        user_photo: userPhoto,
        token_expires: tokenExpires,
      })

      setTokenInput("")
      setIsTokenSheetOpen(false)
      mutate()
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || "Ошибка сохранения токена")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMakeMain = async (accountId: number) => {
    try {
      await api.patch("/admin/vk/connection", { account_id: accountId })
      mutate()
    } catch (err) {
      console.error("Failed to set main account", err)
    }
  }

  const handleDelete = async (accountId: number) => {
    if (!window.confirm("Удалить подключенный аккаунт ВКонтакте?")) return
    try {
      await api.delete(`/admin/vk/connection?account_id=${accountId}`)
      mutate()
    } catch (err) {
      console.error("Failed to delete account", err)
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0 pb-6">
        <div>
          <CardTitle>Подключенные аккаунты ВКонтакте</CardTitle>
          <CardDescription className="mt-1">Управление сохраненными сессиями для публикации и работы с группами.</CardDescription>
        </div>
        <Button variant="outline" onClick={() => setIsTokenSheetOpen(true)}>
          <IconPlus className="mr-2 size-4" />
          Добавить
        </Button>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
                <Skeleton className="size-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))
          ) : error ? (
            <div className="text-center p-4 text-destructive border rounded-lg bg-destructive/5">
              Не удалось загрузить аккаунты
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center p-6 border border-dashed rounded-lg text-muted-foreground">
              Аккаунты пока не подключены
            </div>
          ) : (
            accounts.map((account) => (
              <div 
                key={account.id} 
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border p-4 transition-colors ${
                  account.is_active ? "border-primary/50 bg-primary/5" : "bg-card hover:bg-accent/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="size-10">
                    <AvatarImage src={account.user_photo} />
                    <AvatarFallback>{(account.user_name || "U").substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{account.user_name || `VK ID ${account.vk_user_id}`}</p>
                      {account.is_active && (
                        <Badge variant="default" className="text-[10px] uppercase tracking-wider">Основной</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">VK ID: {account.vk_user_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!account.is_active && (
                    <Button variant="secondary" size="sm" onClick={() => handleMakeMain(account.id)}>Сделать основным</Button>
                  )}
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(account.id)}>
                    <IconTrash className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      <Sheet open={isTokenSheetOpen} onOpenChange={(open) => {
        setIsTokenSheetOpen(open)
        if (!open) {
          setTokenInput("")
          setErrorMsg("")
        }
      }}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Подключение ВКонтакте</SheetTitle>
            <SheetDescription>
              Выберите удобный способ авторизации для добавления аккаунта.
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6 px-4 pb-6">
            {/* Auto Auth */}
            <div className="space-y-3">
              <Button className="w-full" onClick={handleOpenAuth}>
                <IconLink className="mr-2 size-4" />
                Авторизоваться ВКонтакте
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Откроется новое окно. Разрешите доступ, скопируйте URL из адресной строки и вставьте ниже.
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-popover px-2 text-muted-foreground">Ввод токена</span>
              </div>
            </div>

            {/* Manual Auth */}
            <div className="space-y-5">
              <div className="rounded-md border bg-muted/50 p-3 text-sm">
                <div className="flex items-center gap-1.5 font-medium mb-1 text-foreground">
                  <IconAlertTriangle className="size-4 text-amber-500" />
                  Внимание
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  Убедитесь, что вы копируете всю ссылку целиком, она должна начинаться с:
                  <strong className="block mt-1.5 font-mono text-[10px] break-all bg-background border p-1.5 rounded text-foreground font-normal">https://oauth.vk.com/blank.html#access_token=...</strong>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tokenUrl" className="text-sm font-medium">URL с токеном доступа</Label>
                <Input 
                  id="tokenUrl" 
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="https://oauth.vk.com/blank.html#access_token=..." 
                  className="font-mono text-xs h-9"
                  disabled={isProcessing}
                />
                {errorMsg && <p className="text-xs text-destructive mt-1">{errorMsg}</p>}
              </div>
              
              <div className="pt-2">
                <Button variant="secondary" className="w-full h-9" onClick={handleSaveToken} disabled={isProcessing}>
                  {isProcessing ? <IconLoader2 className="mr-2 size-4 animate-spin" /> : <IconKey className="mr-2 size-4" />}
                  Сохранить токен
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  )
}
