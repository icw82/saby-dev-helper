import { readlink, unlink } from 'fs';
import { resolve, relative } from 'path';
import globby from 'globby';
import { settings, base_dir, is } from './../lib/';


const glob = [...settings.modules]
    .map(module => `${ settings.resources }/${ module }`)
    .reduce((result, item) => {
        const rel = relative(base_dir, item).replace(/\\/g, '/');

        result.push(`${ rel }/**/*.(ts|js|less|css|xhtml|tmpl|wml)`);
        return result;
    }, []);

const clean = (cb) => {
    globby(glob, {
        onlyFiles: false,
        stats: true,
    }).then(files => {

        files.forEach(file => {
            if (file.dirent.isSymbolicLink()) {
                readlink(file.path, (error, linkString) => {
                    if (!is.file(linkString)) {
                        unlink(file.path, () => {
                            console.log('Unlinked:', resolve(file.path));
                        });
                    }
                });
            }
        });

        cb();
    });
};

// TODO: Слежение за всеми рабочими файлами, для отлова удаляемых файлов
//       и последующей разлинковки.


export {
    clean,
};
