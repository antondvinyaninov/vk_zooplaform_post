"use client"

import * as React from "react"
import useSWR from "swr"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { IconTrash } from "@tabler/icons-react"
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

export function VkConnectCard() {
  const { data, error, isLoading, mutate } = useSWR<VkConnectionsResponse>("/admin/vk/connection", fetcher)

  const accounts = data?.accounts || []

  const handleMakeMain = async (accountId: number) => {
    try {
      await api.patch("/admin/vk/connection", { account_id: accountId })
      mutate()
    } catch (err) {
      console.error("Failed to set main account", err)
    }
  }

  const handleDelete = async (accountId: number) => {
    if (!window.confirm("Удалить токен загрузки фото?")) return
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
          <CardTitle>Токен для загрузки фото</CardTitle>
          <CardDescription className="mt-1">
            Выдаётся в Mini App: Настройки сообщества → «Разрешить загрузку фото на стену». Не Kate и не /vk-connect. Публикация на стену идёт ключом группы.
          </CardDescription>
        </div>
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
              Пока нет токена фото. Откройте Mini App группы и нажмите «Разрешить загрузку фото на стену».
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
    </Card>
  )
}
