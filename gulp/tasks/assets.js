'use strict';
var argv         = require('yargs').argv;
var autoprefixer = require('autoprefixer');
var browserSync  = require('browser-sync').create();
var cheerio      = require('gulp-cheerio');
var concat       = require('gulp-concat');
var critical     = require('critical').stream;
var cssnano      = require('gulp-cssnano');
var gulp         = require('gulp');
var gzip         = require('gulp-gzip');
var newer        = require('gulp-newer');
var postcss      = require('gulp-postcss');
var rename       = require('gulp-rename');
var rev          = require('gulp-rev');
var revDel       = require('rev-del');
var sass         = require('gulp-sass');
var size         = require('gulp-size');
var sourcemaps   = require('gulp-sourcemaps');
var svgmin       = require('gulp-svgmin');
var svgstore     = require('gulp-svgstore');
var uglify       = require('gulp-uglify');
var when         = require('gulp-if');

// include paths file
var paths        = require('../paths');

// 'gulp scripts' -- creates a index.js file with Sourcemap from your JavaScript files
// 'gulp scripts --prod' -- creates a index.js file from your JavaScript files,
//   minifies, and cache busts it (does not create a Sourcemap)
gulp.task('scripts', () =>
  // NOTE: The order here is important since it's concatenated in order from
  // top to bottom, so you want vendor scripts etc on top
  gulp.src([
    paths.jsFiles + '/vendor/jquery/*.js',
    paths.jsFiles + '/plugins/**/*.js',
    paths.jsFiles + '/main.js'
  ])
    .pipe(newer(paths.jsFilesTemp + '/index.js', {dest: paths.jsFilesTemp, ext: '.js'}))
    .pipe(when(!argv.prod, sourcemaps.init()))
    // concatenate scripts
    .pipe(concat('index.js'))
    .pipe(size({showFiles: true}))
    // minify for production
    .pipe(when(argv.prod, when('*.js', uglify({preserveComments: 'some'}))))
    // output sourcemap for development
    .pipe(when(!argv.prod, sourcemaps.write('.')))
    .pipe(gulp.dest(paths.jsFilesTemp))
    // hash JS for production
    .pipe(when(argv.prod, rev()))
    .pipe(when(argv.prod, size({showFiles: true})))
    // output hashed files
    .pipe(when(argv.prod, gulp.dest(paths.jsFilesTemp)))
    // generate manifest of hashed CSS files
    .pipe(rev.manifest('js-manifest.json'))
    .pipe(gulp.dest(paths.jsFiles))
    .pipe(when(argv.prod, size({showFiles: true})))
);

// 'gulp scripts:gzip --prod' -- gzips JS
gulp.task('scripts:gzip', () =>
  gulp.src([paths.jsFilesTemp + '/*.js'])
  .pipe(when(argv.prod, when('*.js', gzip({append: true}))))
    .pipe(when(argv.prod, size({
      gzip: true,
      showFiles: true
    })))
    .pipe(when(argv.prod, gulp.dest(paths.jsFilesTemp)))
);

// 'gulp styles' -- creates a CSS file from SCSS, adds prefixes and creates a Sourcemap
// 'gulp styles --prod' -- creates a CSS file from your SCSS, adds prefixes,
//   minifies, and cache busts it (does not create a Sourcemap)
gulp.task('styles', () =>
  gulp.src([paths.sassFiles + '/style.scss'])
    .pipe(when(!argv.prod, sourcemaps.init()))
    // preprocess Sass
    .pipe(sass({precision: 10}).on('error', sass.logError))
    // add vendor prefixes
    .pipe(postcss([autoprefixer({browsers: ['last 2 versions', '> 5%', 'IE 9']})]))
    // minify for production
    .pipe(when(argv.prod, when('*.css', cssnano({autoprefixer: false}))))
    .pipe(size({showFiles: true}))
    // output sourcemap for development
    .pipe(when(!argv.prod, sourcemaps.write('.')))
    .pipe(when(argv.prod, gulp.dest(paths.sassFilesTemp)))
    // hash CSS for production
    .pipe(when(argv.prod, rev()))
    .pipe(when(argv.prod, size({showFiles: true})))
    // output hashed files
    .pipe(gulp.dest(paths.sassFilesTemp))
    // generate manifest of hashed CSS files
    .pipe(rev.manifest('css-manifest.json'))
    .pipe(gulp.dest(paths.sassFiles))
    .pipe(when(argv.prod, size({showFiles: true})))
    .pipe(when(!argv.prod, browserSync.stream()))
);

// 'gulp styles:gzip --prod' -- gzips CSS
gulp.task('styles:gzip', () =>
  gulp.src([paths.sassFilesTemp + '/*.css'])
  .pipe(when(argv.prod, when('*.css', gzip({append: true}))))
    .pipe(when(argv.prod, size({
      gzip: true,
      showFiles: true
    })))
    .pipe(when(argv.prod, gulp.dest(paths.sassFilesTemp)))
);

// Page dimensions for common device sizes
var pageDimensions = [{
                        width: 320,
                        height: 480
                      }, {
                        width: 768,
                        height: 1024
                      }, {
                        width: 1280,
                        height: 960
                      }];

// 'gulp styles:critical:page' -- extract layout.page critical CSS into /_includes/critical-page.css
gulp.task('styles:critical:page', () => {
  return gulp.src(paths.tempDir  + paths.siteDir + 'articles/ipad-pro/index.html')
    .pipe(critical({
      base: paths.tempDir,
      inline: false,
      css: [paths.sassFilesTemp + '/style.css'],
      dimensions: pageDimensions,
      dest: paths.sourceDir + paths.includesFolderName + '/critical-page.css',
      minify: true,
      extract: false,
      ignore: ['@font-face',/url\(/] // defer loading of webfonts and background images
    }))
});

// 'gulp styles:critical:archive' -- extract layout.archive critical CSS into /_includes/critical-archive.css
gulp.task('styles:critical:archive', () => {
  return gulp.src(paths.tempDir  + paths.siteDir + 'mastering-paper/index.html')
    .pipe(critical({
      base: paths.tempDir,
      inline: false,
      css: [paths.sassFilesTemp + '/style.css'],
      dimensions: pageDimensions,
      dest: paths.sourceDir + paths.includesFolderName + '/critical-archive.css',
      minify: true,
      extract: false,
      ignore: ['@font-face',/url\(/] // defer loading of webfonts and background images
    }))
});

// 'gulp styles:critical:work' -- extract layout.work critical CSS into /_includes/critical-work.css
gulp.task('styles:critical:work', () => {
  return gulp.src(paths.tempDir  + paths.siteDir + 'paperfaces/asja-k-portrait/index.html')
    .pipe(critical({
      base: paths.tempDir,
      inline: false,
      css: [paths.sassFilesTemp + '/style.css'],
      dimensions: pageDimensions,
      dest: paths.sourceDir + paths.includesFolderName + '/critical-work.css',
      minify: true,
      extract: false,
      ignore: ['@font-face',/url\(/] // defer loading of webfonts and background images
    }))
});

// 'gulp styles:critical:splash' -- extract layout.splash critical CSS into /_includes/critical-splash.css
gulp.task('styles:critical:splash', () => {
  return gulp.src(paths.tempDir  + paths.siteDir + 'index.html')
    .pipe(critical({
      base: paths.tempDir,
      css: [paths.sassFilesTemp + '/style.css'],
      dimensions: pageDimensions,
      dest: paths.sourceDir + paths.includesFolderName + '/critical-splash.css',
      minify: true,
      extract: false,
      ignore: ['@font-face',/url\(/] // defer loading of webfonts and background images
    }))
});

// 'gulp icons' -- combine all svg icons into single file
gulp.task('icons', () => {
  return gulp.src(paths.iconFiles + '/*.svg')
    .pipe(svgmin())
    .pipe(rename({prefix: 'icon-'}))
    .pipe(svgstore({ fileName: 'icons.svg', inlineSvg: true}))
    .pipe(cheerio({
      run: function ($, file) {
        $('svg').attr('style', 'display:none');
        $('[fill]').removeAttr('fill');
      },
      parserOptions: { xmlMode: true }
    }))
    .pipe(size({
      showFiles: true
    }))
    .pipe(gulp.dest(paths.sourceDir + paths.includesFolderName))
});

// function to properly reload your browser
function reload(done) {
  browserSync.reload();
  done();
}
// 'gulp serve' -- open site in browser and watch for changes
// in source files and update them when needed
gulp.task('serve', (done) => {
  browserSync.init({
    // tunnel: true,
    // open: false,
    port: 4000, // change port to match default Jekyll
    ui: {
      port: 4001
    },
    server: [paths.tempFolderName, paths.siteFolderName]
  });
  done();

  // watch various files for changes and do the needful
  gulp.watch([paths.mdFilesGlob, paths.htmlFilesGlob, paths.ymlFilesGlob], gulp.series('build:site', reload));
  gulp.watch([paths.xmlFilesGlob, paths.txtFilesGlob], gulp.series('site', reload));
  gulp.watch(paths.jsFilesGlob, gulp.series('scripts', reload));
  gulp.watch(paths.sassFilesGlob, gulp.series('styles'));
  gulp.watch(paths.imageFilesGlob, gulp.series('copy:images', 'images:lazyload', 'images:feature', reload));
});
