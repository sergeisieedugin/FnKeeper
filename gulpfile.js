"use strict"

// нужные плагины для галп:
// gulp-autoprefixer : автоматом добавляет префиксы типа web-kit и др
// cssbeautify : для вывода красивого и читабельного css файла
// gulp-strip-css-comments : убирает комментарии
// gulp-rename : переименовывает файлы на выходе, добавляя .min (нужно указать в параметрах)
// gulp-sass : из scss в css
// gulp-cssnano : максимально сжимает css файлы
// gulp-rigger : для склейки js файлов
// gulp-uglify : минификация js файлов
// gulp-plumber : предотвращает ломание галпа при ошибке в коде. Просто выводит ошибку и галп работает дальше
// gulp-imagemin : сжатие картинок. Лучше ставить версию 7.1.0 (npm install --save-dev gulp-imagemin@7.1.0). 8 с ошибками
// del : очищение папку с готовым скомпелированным проектом. Понижаем до 6.0.0
// panini : для шаблонизации html
//browser-sync : для локального сервера, который обновляется сам
//gulp-notify : возвращает сообщение об ошибке

// src - для считывания файлов, dest - для записи
// эти 2 строки идут по умолчанию
const {src, dest} = require("gulp");
const gulp = require("gulp");

const autoprefixer = require('gulp-autoprefixer');
const cssBeautify = require('gulp-cssbeautify');
const removeComments = require('gulp-strip-css-comments');
const rename = require('gulp-rename');
const sass = require('gulp-sass')(require('sass'));
const cssNano = require('gulp-cssnano');
const rigger = require('gulp-rigger');
const uglify = require('gulp-uglify');
const plumber = require('gulp-plumber');
const imageMin = require('gulp-imagemin');
const del = require('del');
const panini = require('panini');
const browSync = require('browser-sync').create
const notify = require('gulp-notify');


// пути
const srcPath = 'src/';
const distPath = 'front/';

const path = {
    build: { // куда будут записываться файлы
        html: distPath,
        style: distPath + 'css/*.css',
        loginCss: distPath + 'css/*.css',
        js: distPath + 'js/*.js',
        fonts: distPath + 'fonts/',
        imgs: distPath + 'icons/',
    },
    src: {
        // ** - то есть, смотреть даже в подпапках
        html: srcPath + '*.html', // все файлы такого формата
        style: srcPath + 'assets/scss/style.scss',
        loginCss: srcPath + 'assets/scss/log.scss',
        js: srcPath + 'assets/js/*.js',
        fonts: srcPath + 'assets/fonts/**/*.{eot,woff,woff2,ttf,svg}',
        imgs: srcPath + 'assets/icons/*.svg',
    },
    watch: { // нужен, чтобы галп знал за какими файлами следить и обновлять
        html: srcPath + '**/*.html', // все файлы такого формата
        style: srcPath + 'assets/scss/style.scss',
        loginCss: srcPath + 'assets/scss/log.scss',
        js: srcPath + 'assets/js/**/*.js',
        fonts: srcPath + 'assets/fonts/**/*.{eot,woff,woff2,ttf,svg}',
        imgs: srcPath + 'assets/icons/*.svg',
    },
    clean: './' + distPath // для очистки папки dist

}


function server () {
    browSync.init({
        server: {
            baseDir: "./"+distPath
        }
    })
}
function html() {
    // указываем путь. base - запасной вариант, если будет ошибка в пути
    // предотвращает поломку проекта
    return src(path.src.html, {base: srcPath})
        .pipe(plumber({
            errorHandler: function (err){
                notify.onError({
                    title: 'html ERROR',
                    message: 'Error: <%= error.message %>'
                })(err);
                this.emit('end');
            }
        }))
        .pipe(dest(path.build.html, {base: distPath}))
        // после перезаписи в dist сервер будет перезагружаться

}

function style() {
    return src(path.src.style, {base: srcPath + 'assets/scss/style.scss'})
        .pipe(plumber({
            errorHandler: function (err){
                notify.onError({
                    title: 'SCSS ERROR',
                    message: 'Error: <%= error.message %>'
                })(err);
                this.emit('end');
            }
        }))
        .pipe(sass())
        .pipe(autoprefixer())
        .pipe(dest(path.build.style))
        .pipe(cssNano({
            zindex: false,
            discardComments: {
                removeAll: true
            }
        }))
        .pipe(rename({
            suffix: '.min',
            extname: '.css'
        }))
        .pipe(dest(path.build.style))

}

function loginCss() {
    return src(path.src.loginCss, {base: srcPath + 'assets/scss/log.scss'})
        .pipe(plumber({
            errorHandler: function (err){
                notify.onError({
                    title: 'SCSS ERROR',
                    message: 'Error: <%= error.message %>'
                })(err);
                this.emit('end');
            }
        }))
        .pipe(sass())
        .pipe(autoprefixer())
        .pipe(dest(path.build.loginCss))
        .pipe(cssNano({
            zindex: false,
            discardComments: {
                removeAll: true
            }
        }))
        .pipe(rename({
            suffix: '.min',
            extname: '.css'
        }))
        .pipe(dest(path.build.loginCss))

}

function js() {
    return src(path.src.js, {base: srcPath + 'assets/js/*.js'})
        .pipe(plumber({
            errorHandler: function (err){
                notify.onError({
                    title: 'JS ERROR',
                    message: 'Error: <%= error.message %>'
                })(err);
                this.emit('end');
            }
        }))
        .pipe(rigger())
        .pipe(dest(path.build.js, {base: distPath + 'assets/js/'}))
        .pipe(uglify())
        .pipe(rename({
            suffix: '.min',
            extname: '.js'
        }))
        .pipe(dest(path.build.js, {base: distPath + 'assets/js/'}))


}

function img () {
    return src(path.src.imgs)
        .pipe(imageMin())
        .pipe(dest(path.build.imgs))
}

function clean () {
    return del(path.clean);
}

function watchFiles() {
    gulp.watch(path.watch.html, html);
    gulp.watch(path.watch.style, style);
    gulp.watch(path.watch.loginCss, loginCss);
    gulp.watch(path.watch.js, js);
}

const build = gulp.series(clean, gulp.parallel(html,style,loginCss,js, img))
const watch = gulp.parallel(build,watchFiles)


// exports нужно для каждой функции
exports.html = html;
exports.style = style;
exports.loginCss = loginCss;
exports.js = js;
exports.clean = clean;
exports.build = build;
exports.watch = watch;
exports.server = server;
exports.img = img;

// можно в консоли просто писать gulp и таска будет выполняться
exports.default = watch;