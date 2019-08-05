import { resolve, relative, join, dirname } from 'path';
import { readdirSync, readFileSync } from 'fs';
import { env } from 'process';
import chalk from 'chalk';
import yaml from 'js-yaml';
import is from './is.js';


const messages = {};

messages.binaries = {};
messages.binaries.notFound = (strings, path) => `
    Не найдена папка с дистрибутивом
    ${ path }
`;
messages.binaries.notFound = (strings, path) => `
    Дистрибутив должен быть распакован
    ${ path }
`;
messages.binaries.notFound = (strings, path) => `
    Не найдена папка c модулями из дистрибутива
    ${ path }
`;

messages.sdk = {};
messages.sdk.notFound = (strings, version) => `
    Не найден установленный SDK ${ version }
    Если SDK устанавливался, возможно, требуется перезагрузка
    системы для обновления переменных среды.
`;


const getLocalSettings = () => {
    let locals;

    try {
        locals = yaml.safeLoad(
            readFileSync('local-settings.yaml', 'utf8')
        );
    } catch (error) {
        console.error(error);
    }

    locals.targets = new Set(locals.targets);

    return locals;
};

const getModules = targets => {
    return [...targets].reduce((result, item) => {
        const list = readdirSync(item);
        list.forEach(item => result.add(item));
        return result;
    }, new Set());
};

const getGenieMeta = s3cldPath => {
    const source = dirname(s3cldPath);
    const genieMetaPath = join(source, '.genie/Storage/DeployProject.json');

    if (!is.file(genieMetaPath))
        throw new Error('Не найдена мета-информация Genie');

    const genieMeta = JSON.parse(readFileSync(genieMetaPath));

    const key = Object.keys(genieMeta).find(item => {
        const path = resolve(item);
        return relative(path, source) === '..';
    });

    return genieMeta[key];
};

const getSDKVersion = s3cldPath => {
    try {
        const data =
            readFileSync(s3cldPath, 'utf8');

        const re = /sdk_version="([\d\.]+)"/g;
        const result = re.exec(data);

        if (result) {
            return result[1];
        }

        throw new Error('Не удалось определить версию SDK');
    } catch (error) {
        console.error(error);
    }
};

const getSDKPath= s3cldPath => {
    const version = getSDKVersion(s3cldPath);
    const envVarName = 'SBISPlatformSDK_' + version.replace('.', '');

    if (envVarName in env) {
        return env[envVarName];
    }

    throw new Error(chalk.red(
        messages.sdk.notFound`${ version }`
    ));
};

const getSettings = () => {

    const locals = getLocalSettings();
    locals.modules = getModules(locals.targets);

    const genieMeta = getGenieMeta(locals.s3cld);
    locals.binaries = resolve(genieMeta.Binaries[0].path);
    locals.binaries_modules = join(locals.binaries, 'Модули интерфейса');

    // TODO: Несколько папок с дистрибутивами
    if (!is.directory(locals.binaries)) {
        throw new Error(chalk.red(
            messages.binaries.notFound`${ locals.binaries }`
        ));
    }

    if (genieMeta.Binaries[0].type !== 'unpacked') {
        throw new Error(chalk.red(
            messages.binaries.notUnpacked`${locals.binaries }`
        ));
    }

    if (!is.directory(locals.binaries_modules)) {
        throw new Error(chalk.red(
            messages.binaries.modulesNotFound`${locals.binaries_modules }`
        ));
    }

    locals.dest = resolve(genieMeta.root);
    locals.resources = join(locals.dest, 'build-ui/resources');

    if (!is.directory(locals.dest)) {
        throw new Error('Не найдена папка с развёрнутого стенда');
    }

    if (!is.directory(locals.resources)) {
        throw new Error('Не найдена папка ui-ресурсов');
    }

    locals.sdk = getSDKPath(locals.s3cld);
    locals.sdk_modules = join(locals.sdk, 'ui-modules');

    if (!is.directory(locals.sdk)) {
        throw new Error('Не найдена папка SDK');
    }

    if (!is.directory(locals.sdk_modules)) {
        throw new Error('Не найдена папка c модулями SDK');
    }

    return locals;
};


export default getSettings();
