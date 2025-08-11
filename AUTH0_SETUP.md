# Auth0 Setup Instructions for Casa Chindea

## Step 1: Create Auth0 Account
1. Go to https://auth0.com
2. Sign up for a free account
3. Choose "Personal" for account type

## Step 2: Create Application
1. In Auth0 Dashboard, go to "Applications"
2. Click "Create Application"
3. Name: "Casa Chindea Web App"
4. Choose "Single Page Web Applications"
5. Click "Create"

## Step 3: Configure Application Settings
1. In your new application settings, find:
   - **Domain**: Something like `dev-yourtenant.eu.auth0.com`
   - **Client ID**: A long string like `abc123def456...`

2. In "Allowed Callback URLs", add:
   ```
   http://localhost:8080/js/pages/login.html,
   https://casa-chindea.vercel.app/js/pages/login.html
   ```

3. In "Allowed Logout URLs", add:
   ```
   http://localhost:8080/js/pages/login.html,
   https://casa-chindea.vercel.app/js/pages/login.html
   ```

4. In "Allowed Web Origins", add:
   ```
   http://localhost:8080,
   https://casa-chindea.vercel.app
   ```

## Step 4: Update Configuration
1. Open `public/js/pages/login.html`
2. Replace the Auth0 config:
   ```javascript
   const auth0Config = {
       domain: "YOUR_ACTUAL_DOMAIN.eu.auth0.com", // From Step 3
       clientId: "YOUR_ACTUAL_CLIENT_ID", // From Step 3
       redirect_uri: window.location.origin + "/js/pages/login.html"
   };
   ```

## Step 5: Test Authentication
1. Open your login page
2. Click "Auth0" button to test login
3. You should be redirected to Auth0 login page
4. After login, you should return to your site with user info displayed

## Optional: Customize Login Page
In Auth0 Dashboard > Branding > Universal Login:
- Upload Casa Chindea logo
- Customize colors to match your theme
- Add custom CSS if needed

## Security Notes
- Never commit real Auth0 credentials to public repositories
- Use environment variables for production
- Enable MFA (Multi-Factor Authentication) for admin accounts
- Set up proper user roles if needed
