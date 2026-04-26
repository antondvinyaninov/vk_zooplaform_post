import * as React from "react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IconSend } from "@tabler/icons-react"

export function QuickPostForm() {
  return (
    <Card className="flex flex-col h-full shadow-sm">
      <CardHeader>
        <CardTitle>Быстрая публикация</CardTitle>
        <CardDescription>Создайте и отправьте пост в любую подключенную группу.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="group-select">Выберите группу</Label>
          <Select>
            <SelectTrigger id="group-select">
              <SelectValue placeholder="Сначала подключите группы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="group1">Типичный программист</SelectItem>
              <SelectItem value="group2">Смешные коты</SelectItem>
              <SelectItem value="group3">Городские новости</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="postMessage">Текст поста</Label>
          <Textarea 
            id="postMessage" 
            placeholder="Введите текст поста..." 
            className="min-h-[120px] resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="publishDate">Отложенная публикация</Label>
          <Input type="datetime-local" id="publishDate" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="postPhotos">Фотографии</Label>
          <Input type="file" id="postPhotos" accept="image/*" multiple />
          <div className="text-xs text-muted-foreground mt-1">Поддерживаются форматы JPG, PNG. Максимум 10 фото.</div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">
          <IconSend className="mr-2 size-4" />
          Опубликовать
        </Button>
      </CardFooter>
    </Card>
  )
}
