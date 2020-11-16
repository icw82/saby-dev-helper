// /**
//  *  D O C S
//  */
// {

//     const sources = [
//         'eo/client/EOREQ/**/*.js',
//     ].map(item => `/mnt/c/tz/${ item }`);

//     const buildDocs = (cb) => {
//         const config = require('./jsdoc.json');

//         src(sources, { read: false })
//             .pipe(jsdoc(config, cb));
//     };

//     const watchDocs = () => {
//         watch(sources, { events: 'all' }, parallel(buildDocs));
//     };

//     exports.docs = series(buildDocs, watchDocs);

// }
