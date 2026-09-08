# Шрифтове

„Малкото Умниче“ работи офлайн. Значи **никакъв Google Fonts CDN** — шрифтът трябва да
живее в репото, иначе първото отваряне в самолетен режим ще падне обратно към
системния шрифт и продуктът ще изглежда като чужд.

## Избор: Nunito

| Критерий | Защо Nunito |
|---|---|
| Форма | Заоблени краища — топъл и безопасен, без да е инфантилен |
| Кирилица | Пълно и качествено покритие, включително `й`, `ъ`, `ь` |
| Тегла | Променлив шрифт 400–800 — цялата ни скала в един файл |
| Лиценз | SIL Open Font License 1.1 — свободен за търговска употреба |
| Четимост | Отворени броеници; `а`, `о`, `е` не се сливат при едър кегел |

## Състояние: готово ✅

```
public/fonts/
  nunito-variable.woff2            38 KB — латиница + пунктуация (313 глифа)
  nunito-variable-cyrillic.woff2   19 KB — кирилица (140 глифа)
design-source/fonts/Nunito/        суровите TTF от Google Fonts (2.7 MB)
```

И двата файла запазват променливата ос `wght 200–1000`, което покрива цялата
скала на проекта (400–800) от един файл.

## Защо суровите файлове не са в `public/`

Пакетът от Google Fonts тежи 2.7 MB и съдържа 18 статични среза плюс два
променливи. Всичко в `public/` влиза в precache на service worker-а — тоест
всяко дете щеше да тегли 2.7 MB шрифтове, за да ползва 57 KB от тях.
Оригиналите стоят в `design-source/`, откъдето Vite не ги копира.

## Как са направени подмножествата

Двата `@font-face` блока в `src/design-system/base.css` са разделени по
`unicode-range`, така че браузърът тегли кирилицата само когато я срещне.

Ако някога трябва да се прегенерират:

```bash
pip install fonttools brotli
```

```bash
cd public/fonts && python -m fontTools.subset ../../design-source/fonts/Nunito/Nunito-VariableFont_wght.ttf --output-file=nunito-variable.woff2 --flavor=woff2 --layout-features='*' --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+2000-206F,U+2122"
```

```bash
cd public/fonts && python -m fontTools.subset ../../design-source/fonts/Nunito/Nunito-VariableFont_wght.ttf --output-file=nunito-variable-cyrillic.woff2 --flavor=woff2 --layout-features='*' --unicodes="U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116"
```

## Проверено

- `document.fonts` показва и двата среза със статус `loaded`
- „Ежко Ябълков щъркел" се рисува с Nunito, не с резервния шрифт
- `h1` наследява `Nunito` през `--font-display`

## Правило

Шрифтът се задава **само** през `--font-body` / `--font-display` в
`tokens.css`. Компонент, който пише `font-family` директно, е бъг.
