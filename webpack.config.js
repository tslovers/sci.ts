module.exports = {
    entry: './lib/sci.js',
    devtool: 'source-map',
    output: {
        path: __dirname,
        filename: 'bundle/sci.js',
        library: 'sci'
    }
};