package parser

import (
	"testing"
	"backend/vk"
)

func buildCity(id int, title string) *struct {
	ID    int    `json:"id"`
	Title string `json:"title"`
} {
	return &struct {
		ID    int    `json:"id"`
		Title string `json:"title"`
	}{ID: id, Title: title}
}

func TestIsRelevantGroup(t *testing.T) {
	cityID := 1
	cityTitle := "Москва"

	tests := []struct {
		name     string
		group    vk.Group
		expected bool
	}{
		{
			name: "Обычная группа приюта",
			group: vk.Group{
				Name:        "Приют для собак Хатико",
				Description: "Помогаем бездомным животным найти дом",
				City:        buildCity(1, "Москва"),
			},
			expected: true,
		},
		{
			name: "Ветеринарная клиника",
			group: vk.Group{
				Name:        "Ветклиника Добрый Доктор",
				Description: "Услуги ветеринара, анализы, УЗИ для ваших питомцев",
				City:        buildCity(1, "Москва"),
			},
			expected: true,
		},
		{
			name: "Человеческая парикмахерская (Ложное срабатывание на 'стрижка')",
			group: vk.Group{
				Name:        "Салон красоты Y.M.STUDIO",
				Description: "Современные техники стрижки, окрашивание волос, женские прически",
				City:        buildCity(1, "Москва"),
			},
			expected: false,
		},
		{
			name: "Стрижка собак (Настоящий грумер)",
			group: vk.Group{
				Name:        "Груминг салон Пушистик",
				Description: "Стрижка собак и кошек, профессиональные услуги",
				City:        buildCity(1, "Москва"),
			},
			expected: true,
		},
		{
			name: "Несовпадение города (Строгое)",
			group: vk.Group{
				Name:        "Помощь бездомным собакам",
				Description: "Приют",
				City:        buildCity(2, "Санкт-Петербург"),
			},
			expected: false,
		},
		{
			name: "Магазин CBD масел (Упоминает животных)",
			group: vk.Group{
				Name:        "Canna Eywa",
				Description: "Применяется для некрупных людей и животных.",
				City:        buildCity(1, "Москва"),
			},
			// Проходит, так как есть слово "животных" и нет жестких слов запрета.
			// Алгоритм считает, что это просто группа про животных.
			expected: true, 
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isRelevantGroup(tt.group, cityID, cityTitle)
			if result != tt.expected {
				t.Errorf("isRelevantGroup() = %v, want %v\nGroup: %s\nDesc: %s", result, tt.expected, tt.group.Name, tt.group.Description)
			}
		})
	}
}
