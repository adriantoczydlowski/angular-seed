/* jshint camelcase:false */
var gulp = require('gulp');
var pkg = require('./package.json');
var common = require('./gulp/common.js');
var plug = require('gulp-load-plugins')();
var gulpFilter = require('gulp-filter');
var watch = require('gulp-watch');
var env = plug.util.env;
var log = plug.util.log;

gulp.task('help', plug.taskListing);

/**
 * @desc Lint the code
 */
gulp.task('jshint', function () {
    log('Linting the JavaScript');

    var sources = [].concat(pkg.paths.js);
    return gulp
        .src(sources)
        .pipe(plug.jshint('./.jshintrc'))
        .pipe(plug.jshint.reporter('jshint-stylish'));
});

/**
 * @desc Create $templateCache from the html templates
 */
gulp.task('templatecache', function () {
    log('Creating an AngularJS $templateCache');

    return gulp
        .src(pkg.paths.htmltemplates)
        .pipe(plug.angularTemplatecache('templates.js', {
            module: 'app.core',
            standalone: false,
            root: 'app/'
        }))
        .pipe(gulp.dest(pkg.paths.stage));
});

/**
 * @desc Compiles app's CoffeeScript
 */
gulp.task('coffee', function () {
    log('Compiles app\'s  CoffeeScript');

    return gulp
        .src(pkg.paths.coffee)
        .pipe(plug.coffee().on('error', log))
        .pipe(gulp.dest(pkg.paths.build + 'app'));
});

/**
 * @desc Minify and bundle the app's JavaScript
 */
gulp.task('js', ['coffee', 'jshint', 'templatecache'], function () {
    log('Bundling, minifying, and copying the app\'s  JavaScript');

    var source = [].concat(pkg.paths.js, pkg.paths.stage + 'templates.js');
    return gulp
        .src(source)
        .pipe(plug.sourcemaps.init())
        .pipe(plug.concat('all.min.js'))
        .pipe(plug.ngAnnotate({add: true, single_quotes: true}))
        .pipe(plug.bytediff.start())
        .pipe(plug.uglify({mangle: true}))
        .pipe(plug.bytediff.stop(common.bytediffFormatter))
        .pipe(plug.sourcemaps.write('./'))
        .pipe(gulp.dest(pkg.paths.stage));
});

/**
 * @desc Copy the Vendor JavaScript
 */
gulp.task('vendorjs', function () {
    log('Bundling, minifying, and copying the Vendor JavaScript');

    return gulp.src(pkg.paths.vendorjs)
        .pipe(plug.concat('vendor.min.js'))
        .pipe(plug.bytediff.start())
        .pipe(plug.bytediff.stop(common.bytediffFormatter))
        .pipe(gulp.dest(pkg.paths.stage));
});

/**
 * @desc Minify and bundle the CSS
 */
gulp.task('css', function () {
    log('Bundling, minifying, and copying the app\'s CSS');
    return gulp.src(pkg.paths.css)
        .pipe(plug.concat('all.min.css')) // Before bytediff or after
        .pipe(plug.autoprefixer('last 2 version', '> 5%'))
        .pipe(plug.bytediff.start())
        .pipe(plug.minifyCss({}))
        .pipe(plug.bytediff.stop(common.bytediffFormatter))
//        .pipe(plug.concat('all.min.css')) // Before bytediff or after
        .pipe(gulp.dest(pkg.paths.stage));
});

/**
 * @desc Minify and bundle the Vendor CSS
 */
gulp.task('vendorcss', function () {
    log('Compressing, bundling, compying vendor CSS');

    var cssFilter = gulpFilter('*.css');
    var bowerSrc = require('main-bower-files');

    return gulp.src(bowerSrc())
        .pipe(cssFilter)
        .pipe(plug.concat('vendor.min.css'))
        .pipe(plug.bytediff.start())
        .pipe(plug.minifyCss({}))
        .pipe(plug.bytediff.stop(common.bytediffFormatter))
        .pipe(gulp.dest(pkg.paths.stage));
});

/**
 * @desc Copy fonts
 */
gulp.task('fonts', function () {
    var dest = pkg.paths.build + 'styles/fonts/';
    log('Copying fonts');
    return gulp
        .src(pkg.paths.fonts)
        .pipe(gulp.dest(dest));
});

/**
 * @desc Compiles app's  *.slim with AngularJS
 */
gulp.task('slim', function () {
    log('Compiles app\'s  *.slim with AngularJS');

    return gulp
        .src(pkg.paths.slim)
        .pipe(plug.slim({
          pretty: true,
          options: "attr_delims={'(' => ')', '[' => ']'}"
        }))
        .pipe(gulp.dest(pkg.paths.build + 'app'));
});

/**
 * @desc Compress images
 */
gulp.task('images', function () {
    var dest = pkg.paths.compressedimages + 'compressed';
    log(dest)
    log('Compressing, caching, and copying images');
    return gulp
        .src(pkg.paths.images)
        .pipe(plug.cache(plug.imagemin({optimizationLevel: 3})))
        .pipe(gulp.dest(dest));
});

/**
 * @desc Compile Sass to CSS using Compass
 */
gulp.task('compass', function () {
    var dest = pkg.paths.build + 'styles';
    log('Compile Sass to CSS using Compass');
    return gulp
        .src(pkg.paths.sass)
        .pipe(plug.compass({
          sass: 'src/styles',
          image: 'src/build/styles/images',
          generatedImages: 'src/build/styles/sprites',
          css: 'src/build/styles',
          comments: false
        }))
        .on('error', function(err) {
          log(err);
        })
        .pipe(gulp.dest(dest));
});

/**
 * @desc copy bower components font
 */
gulp.task('copy-font', function () {
  log('copy bower componenets font');

  var fontFilter = gulpFilter(['*.eot', '*.woff', '*.svg', '*.ttf']);
  var bowerSrc = require('main-bower-files');

  return gulp
    .src(bowerSrc())
    .pipe(fontFilter)
    .pipe(gulp.dest(pkg.paths.styles + 'fonts'));
});

/**
 * @desc Inject JavaScript's into the index.html
 */
gulp.task('inject-angular', function () {
  log(' Inject angular JavaScript\'s into the index.html');

  var angularJs = gulp.src(pkg.paths.js);

  return gulp
    .src(pkg.paths.src+ '/index.html')
    .pipe(plug.inject(angularJs, {
      starttag: '<!-- inject:js -->' ,
      ignorePath: ['src'],
      relative: true
    }))
    .pipe(gulp.dest(pkg.paths.src));
});

/**
 * @desc Inject all bower components into the index.html
 */
gulp.task('inject-bower', function () {
  log('Inject bower componenets into the index.html');

  var jsFilter = gulpFilter('*.js');
  var cssFilter = gulpFilter('*.css');
  var bowerSrc = require('main-bower-files');

  var src = gulp.src(bowerSrc());
  var bowerJs = src.pipe(jsFilter);
  var bowerCss = src.pipe(cssFilter);

  return gulp
    .src(pkg.paths.src+ '/index.html')
    .pipe(plug.inject(bowerJs, {
      starttag: '<!-- inject-vendor:js -->',
      ignorePath: ['src'],
      relative: true
    }))
    .pipe(plug.inject(bowerCss, {
      starttag: '<!-- inject-vendor:css -->',
      ignorePath: ['src'],
      relative: true
    }))
    .pipe(gulp.dest(pkg.paths.src));
});

/**
 * @desc Inject all the files into the new index.html
 */
gulp.task('stage',
    [ 'gzip', 'vendorjs', 'css', 'vendorcss', 'images', 'fonts'], function () {
        log('Building index.html to stage');

        return gulp
            .src(pkg.paths.src+ '/index.html')
            .pipe(inject([pkg.paths.stage + 'content/vendor.min.css'], 'inject-vendor'))
            .pipe(inject([pkg.paths.stage + 'content/all.min.css']))
            .pipe(inject(pkg.paths.stage + 'vendor/vendor.min.js', 'inject-vendor'))
            .pipe(inject([pkg.paths.stage + 'all.min.js']))
            .pipe(gulp.dest(pkg.paths.stage));

        function inject(glob, name) {
            var ignorePath = pkg.paths.stage.substring(1);
            var options = {ignorePath: ignorePath};
            if (name) {
                options.name = name;
            }
            return plug.inject(gulp.src(glob), options);
        }
    });

/**
 * @desc Remove all files from the build folder
 */
gulp.task('clean', function () {
    log('Cleaning: ' + plug.util.colors.green(pkg.paths.stage));
    log('Cleaning: ' + plug.util.colors.red(pkg.paths.build));
    var source = [].concat(pkg.paths.build, pkg.paths.stage);
    return gulp
        .src(source, {read: false})
        .pipe(plug.rimraf({force: true}));
});

/**
 * @desc Watch files and build
 */
gulp.task('watch', function () {
    log('Watching all files');


    watch(pkg.paths.bower, function (files, cb) {
      gulp.start(['inject-bower', 'copy-font'], cb);
    });

    watch(pkg.paths.images, function (files, cb) {
      gulp.start('images', cb);
    });

    watch(pkg.paths.slim, function (files, cb) {
      gulp.start('slim', cb);
    });

    watch(pkg.paths.sass, function (files, cb) {
      gulp.start('compass', cb);
    });

    watch(pkg.paths.coffee, function (files, cb) {
      gulp.start('coffee', cb);
    });

    watch(pkg.paths.js, function (files, cb) {
      gulp.start(['jshint', 'inject-angular'], cb);
    }).pipe(plug.connect.reload());

    watch(pkg.paths.htmltemplates, function (files, cb) {
    }).pipe(plug.connect.reload());

    watch(pkg.paths.css, function (files, cb) {
    }).pipe(plug.connect.reload());

});

/**
 * @desc Watch files and build
 */
gulp.task('watch2', function () {
    log('Watching all files');

    var css = ['gulpfile.js'].concat(pkg.paths.css);
    var images = ['gulpfile.js'].concat(pkg.paths.images);
    var js = ['gulpfile.js'].concat(pkg.paths.js);
    var bower = ['gulpfile.js'].concat(pkg.paths.bower);

    gulp
        .watch(bower, ['inject-bower', 'copy-font'])
        .on('change', logWatch);

    gulp
        .watch(js, ['js', 'inject-angular'])
        .on('change', logWatch);

    gulp
        .watch(css, ['css', 'vendorcss'])
        .on('change', logWatch);

    gulp
        .watch(images, ['images'])
        .on('change', logWatch);

    function logWatch(event) {
        log('*** File ' + event.path + ' was ' + event.type + ', running tasks...');
    }
});

/**
 * connect the dev environment with gulp-connect
 */
gulp.task('connect', function () {
  plug.connect.server({
    root: ['src', 'build'],
    port: 9000,
    livereload: true
  });

});

/**
 * run dev server
 */
gulp.task('serve', function () {
  gulp.start(['connect', 'watch']);
});

/**
 * serve the dev environment
 */
gulp.task('serve-dev', function () {
    serve({env: 'dev'});
    startLivereload('development');
});


function startLivereload(env) {
    var path = (env === 'stage' ? [pkg.paths.stage, pkg.paths.client + '/**'] : [pkg.paths.client + '/**']);
    var options = {auto: true};
    plug.livereload.listen(options);
    gulp
        .watch(path)
        .on('change', function (file) {
            plug.livereload.changed(file.path);
        });

    log('Serving from ' + env);
}

function serve(args) {
    var options = {
        script: pkg.paths.server + 'app.js',
        delayTime: 1,
        ext: 'html js',
        env: {'NODE_ENV': args.env},
        watch: ['gulpfile.js',
                'package.json',
                pkg.paths.server,
                pkg.paths.client]
    };

    return plug.nodemon(options)
        //.on('change', tasks)
        .on('restart', function () {
            log('restarted!');
        });
}