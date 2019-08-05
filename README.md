# Saby-dev-helper

Неиллюзорная помощь разработчику в сами-знаете-какой-конторе.

* Конвертирует TypeScript и LESS у нужные директории;
* Генерирует документацию

## Установка

1. `npm install gulp-cli -g`
2. `npm i`
3. Создать файл `local-settings.yaml` с содержимым:

    ```yaml
    s3cld: '/path/to/project.s3cld'

    targets:
      - '/path/to/client-directory'
      - '/path/to/another-client-directory'
    ```

    где `/path/to/project.s3cld` — путь до s3cld-файла проекта,
    а `targets` — массив рабочих каталогов `client`.

## Запуск

Для корректной работы __Saby-dev-helper__ нужно, чтобы стенд проекта был развёрнут.
Команда `gulp` запускает скрипт.
