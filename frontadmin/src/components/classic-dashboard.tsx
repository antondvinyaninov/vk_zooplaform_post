import * as React from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Activity, CreditCard, DollarSign, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Импортируем компоненты сайдбара и шапки
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"

// Dummy data for the chart
const data = [
  { name: "Янв", total: Math.floor(Math.random() * 5000) + 1000 },
  { name: "Фев", total: Math.floor(Math.random() * 5000) + 1000 },
  { name: "Мар", total: Math.floor(Math.random() * 5000) + 1000 },
  { name: "Апр", total: Math.floor(Math.random() * 5000) + 1000 },
  { name: "Май", total: Math.floor(Math.random() * 5000) + 1000 },
  { name: "Июн", total: Math.floor(Math.random() * 5000) + 1000 },
  { name: "Июл", total: Math.floor(Math.random() * 5000) + 1000 },
  { name: "Авг", total: Math.floor(Math.random() * 5000) + 1000 },
  { name: "Сен", total: Math.floor(Math.random() * 5000) + 1000 },
  { name: "Окт", total: Math.floor(Math.random() * 5000) + 1000 },
  { name: "Ноя", total: Math.floor(Math.random() * 5000) + 1000 },
  { name: "Дек", total: Math.floor(Math.random() * 5000) + 1000 },
]

export function ClassicDashboard() {
  return (
    <SidebarProvider>
      <AppSidebar />
      {/* SidebarInset создаёт тот самый эффект "обёрнутого" контента с рамкой и скруглениями */}
      <SidebarInset>
        <SiteHeader />
        
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Обзор</h2>
            <div className="flex items-center space-x-2">
              <Button>Скачать отчёт</Button>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Общая выручка</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₽4,523,189</div>
                <p className="text-xs text-muted-foreground">+20.1% по сравнению с прошлым месяцем</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Подписки</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+2350</div>
                <p className="text-xs text-muted-foreground">+180.1% по сравнению с прошлым месяцем</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Продажи</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+12,234</div>
                <p className="text-xs text-muted-foreground">+19% по сравнению с прошлым месяцем</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Активные сейчас</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+573</div>
                <p className="text-xs text-muted-foreground">+201 за последний час</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Динамика</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₽${value}`} />
                    <Bar dataKey="total" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Недавние продажи</CardTitle>
                <CardDescription>Вы совершили 265 продаж в этом месяце.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {[
                    { name: "Оливия Мартин", email: "olivia.martin@email.com", amount: "+₽1,999.00", initials: "ОМ" },
                    { name: "Джексон Ли", email: "jackson.lee@email.com", amount: "+₽39.00", initials: "ДЛ" },
                    { name: "Изабелла Нгуен", email: "isabella.nguyen@email.com", amount: "+₽299.00", initials: "ИН" },
                    { name: "Уильям Ким", email: "will@email.com", amount: "+₽99.00", initials: "УК" },
                    { name: "София Дэвис", email: "sofia.davis@email.com", amount: "+₽39.00", initials: "СД" },
                  ].map((sale) => (
                    <div key={sale.email} className="flex items-center">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={`/avatars/${sale.initials}.png`} alt="Avatar" />
                        <AvatarFallback>{sale.initials}</AvatarFallback>
                      </Avatar>
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">{sale.name}</p>
                        <p className="text-sm text-muted-foreground">{sale.email}</p>
                      </div>
                      <div className="ml-auto font-medium">{sale.amount}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
