'use strict';

module.exports = function (grunt) {

    // Use jit-grunt to only load necessary tasks for each invocation of grunt.
    require('jit-grunt')(grunt, {
        // useminPrepare is a task of usemin.
        'useminPrepare': 'grunt-usemin',
    });

    require('time-grunt')(grunt);

    grunt.initConfig({
        config: {
            app: 'app',
            dist: 'dist',
            lib: 'app/lib',
            htmlmin: {
                collapseBooleanAttributes: true,
                collapseWhitespace: true,
                removeAttributeQuotes: true,
                removeComments: true,
                removeEmptyAttributes: true,
                removeScriptTypeAttributes: true,
                removeStyleLinkTypeAttributes: true,
                useShortDoctype: true
            }
        },
        concurrent: {
            options: {
                logConcurrentOutput: true
            },
            dev: [
                'compass:watch'
            ]
        },
        connect: {
            options: {
                port: process.env.PORT || 9000
            },
            dev: {
                options: {
                    base: '<%= config.app %>'
                }
            },
            dist: {
                options: {
                    base: '<%= config.dist %>'
                }
            }
        },
        open: {
            server: {
                url: 'http://localhost:<%= connect.options.port %>'
            }
        },
        compass: {
            options: {
                sassDir: '<%= config.app %>/sass',
                cssDir: '<%= config.app %>/styles',
                imagesDir: '<%= config.app %>/images',
                generatedImagesDir: '<%= config.app %>/images/generated',
                fontsDir: '<%= config.app %>/fonts',
                relativeAssets: true,
                importPath: '<%= config.lib %>/sass-font-face',
                debugInfo: false
            },
            dev: {
                options: {}
            },
            force: {
                options: {
                    force: true
                }
            },
            watch: {
                options: {
                    watch: true
                }
            }
        },
        clean: {
            dist: {
                files: [{
                    dot: true,
                    src: [
                        '<%= config.dist %>/*',
                        '!<%= config.dist %>/.git*'
                    ]
                }]
            },
            dev: [
                '<%= config.app %>/styles',
                '<%= config.app %>/images/generated'
            ]
        },
        rev: {
            dist: {
                files: {
                    src: [
                        '<%= config.dist %>/styles/**/*.css',
                        '<%= config.dist %>/images/**/*.{png,jpg,jpeg,gif,webp,svg}',
                        '!<%= config.dist %>/images/inline_html_images/**/*'
                    ]
                }
            }
        },
        useminPrepare: {
            html: '<%= config.app %>/index.html',
            options: {
                dest: '<%= config.dist %>'
            }
        },
        usemin: {
            html: ['<%= config.dist %>/{,*/}*.html'],
            css: ['<%= config.dist %>/styles/{,*/}*.css'],
            options: {
                dirs: ['<%= config.dist %>']
            }
        },
        imagemin: {
            dist: {
                files: [{
                    expand: true,
                    src: '<%= config.dist %>/images/**/*.{png,jpg,jpeg}'
                }]
            }
        },
        svgmin: {
            dist: {
                files: [{
                    expand: true,
                    src: '<%= config.dist %>/images/**/*.svg'
                }]
            }
        },
        htmlmin: {
            dist: {
                options: '<%= config.htmlmin %>',
                files: [{
                    expand: true,
                    src: '<%= config.dist %>/index.html'
                }]
            }
        },
        // Put files not handled in other tasks here
        copy: {
            dist: {
                files: [
                    {
                        expand: true,
                        dot: true,
                        cwd: '<%= config.app %>',
                        dest: '<%= config.dist %>',
                        src: [
                            'index.html',
                            '*.{ico,png,txt}',
                            'images/**/*.{png,jpg,jpeg,gif,webp,svg}',
                            '!images/*/sprite-files/*',
                            'fonts/**/*',
                            '!fonts/**/originals/*',
                            '!fonts/**/*.json'
                        ]
                    }
                ]
            }
        },
        uglify: {
            options: {
                compress: {
                    drop_console: true
                }
            }
        },
        inline: {
            dist: {
                options:{
                    tag: ''
                },
                src: ['dist/index.html']
            }
        }
    });

    grunt.registerTask('default', 'dev');

    grunt.registerTask('dev', function (locale) {
        grunt.task.run([
            'clean:dev',
            'compass:dev',
            'connect:dev',
            'open',
            'concurrent:dev'
        ]);
    });

    grunt.registerTask('build', function (locale) {
        grunt.task.run([
            'clean',
            'compass:dev',
            'useminPrepare',
            'copy:dist',
            'concat:generated',
            'imagemin',
            'svgmin',
            'cssmin',
            'uglify',
            'rev',
            'usemin',
            'inline',
            'htmlmin'
        ]);
    });
};

