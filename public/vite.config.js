export default {
    server: {
        proxy: {
            '/api': {
                target: 'https://casa-chindea.onrender.com',
                changeOrigin: true,
                secure: false,
            }
        }
    }
};