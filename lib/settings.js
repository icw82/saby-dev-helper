import { resolve, join, dirname, basename } from 'path';
import { readdirSync, readFileSync } from 'fs';
import { env } from 'process';
import chalk from 'chalk';
import { argv } from 'yargs';
import is from './is.js';


const base_dir = resolve(__dirname, '..'); // eslint-disable-line

const messages = {};

messages.binaries = {};
messages.binaries.notFound = (strings, path) => `
    Не найдена папка с дистрибутивом
    ${ path }
`;
messages.binaries.modulesNotFound = (strings, path) => `
    Не найдена папка c модулями из дистрибутива
    ${ path }
`;

messages.sdk = {};
messages.sdk.notFound = (strings, version) => `
    Не найден установленный SDK ${ version }
    Если SDK устанавливался, возможно, требуется перезагрузка
    системы для обновления переменных среды.
`;

const getParams = () => {
    const { s3cld, target } = argv;
    const params = {};

    // TODO: проверка допустимых параметров?
    if (!s3cld || !target) {
        throw Error();
    }

    params.s3cld = s3cld;
    params.targets = target instanceof Array ? target : [target];

    params.targets = new Set(params.targets);

    return params;
};

const IGNORE = [
    '.vscode',
];

const getModules = targets =>
    [...targets].reduce((result, target) => {
        const list = readdirSync(target);

        list.forEach(item => {
            !IGNORE.includes(item) &&
            !is.file(join(target, item)) && // не is.directory, может быть ещё не создана
            result.add(item);
        });

        return result;
    }, new Set());

const getGenieMeta = s3cldPath => {
    const source = dirname(s3cldPath);
    const name = basename(s3cldPath);
    const genieMetaPath = join(source, '.genie/Storage', name, 'DeployStandSettings.json');

    if (!is.file(genieMetaPath)) {
        throw new Error(`Не найдена мета-информация Genie: ${ genieMetaPath }`);
    }

    const genieMeta = JSON.parse(readFileSync(genieMetaPath));

    // const key = Object.keys(genieMeta).find(item => {
    //     const path = resolve(item);
    //     return relative(path, source) === '..';
    // });

    return genieMeta; //[key];
};

const getGenieUnpackedDistrib = s3cldPath => {
    const source = dirname(s3cldPath);
    return join(source, '.genie/unpack_distrib');
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

    const locals = getParams();
    locals.modules = getModules(locals.targets);

    const genieMeta = getGenieMeta(locals.s3cld);

    if (typeof genieMeta.Distribution !== 'string') {
        throw Error('Что-то поменялось у разработчиков Genie');
    }

    if (genieMeta.Distribution !== '') {
        locals.binaries = getGenieUnpackedDistrib(locals.s3cld);

        if (!is.directory(locals.binaries)) {
            throw new Error(chalk.red(
                messages.binaries.notFound`${ locals.binaries }`
            ));
        }

        locals.distrib_modules = join(locals.binaries, 'Модули интерфейса');

        // if (!is.directory(locals.distrib_modules)) {
        //     throw new Error(chalk.red(
        //         messages.binaries.modulesNotFound`${locals.distrib_modules }`
        //     ));
        // }
    }

    locals.dest = resolve(genieMeta.RootPath);
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

const settings = getSettings();


export {
    settings as default,
    base_dir,
};
