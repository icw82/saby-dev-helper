import * as fs from 'fs';
import { promisify } from 'util';
import { resolve, relative, join, extname, basename, dirname } from 'path';

import globby from 'globby';

import { settings, ISettings } from './../lib/settings';
import { is } from './../lib/is';

// const getGlobOfSources = (
//     settings: ISettings,
// ): {
//     glob: string[];
//     relTargets: Set<string>;
// } => {
//     const glob = new Set() as Set<string>;
//     const relTargets = new Set() as Set<string>;

//     settings.targets.forEach((target: string) => {
//         const rel = relative(settings.baseDir, target);

//         relTargets.add(rel);

//         const base = rel.replace(/\\/g, '/');

//         glob.add(`${ base }/**/*.(ts|js|less|css|xhtml|tmpl|wml)`);
//         glob.add(`!${ base }/**/node_modules/**/*`);
//     });

//     return {
//         glob: [...glob],
//         relTargets,
//     };
// };

// const { glob } = getGlobOfSources(settings);


const syncSDK = async() => {
    // const files = await globby(glob, {
    //     onlyFiles: true,
    // }) as unknown[];

    // console.log('>>', settings.sdkModulesPath);
    // await Promise.all(files.map(syncFile));
};

export {
    syncSDK,
};
