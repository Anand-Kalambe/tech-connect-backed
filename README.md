Tech Connect 🚀 Hey everyone! 👋 Welcome to Tech Connect.

I built this platform to be a sleek, modern social space where people can share what's on their minds, drop some photos, and actually chat with friends. My main goal was to create a really smooth, dynamic web experience—focusing heavily on responsive design, snappy interactions, and, of course, a proper Dark Mode for those late-night coding sessions.

🌐 Live Demos Want to skip the setup and just see it in action? I've got it hosted here:

Frontend (Vercel): https://tech-connect-ruby.vercel.app

Backend API (Render): https://tech-connect-backed.onrender.com

(Note: Since the backend is on Render's free tier, it might take a few seconds to wake up on your first request. Hang tight!)

✨ What's Inside? No Bots Allowed: Secure authentication with real email OTP verification powered by Nodemailer. We make sure our users are actual humans.

The Global Feed: A dynamic public timeline where you can browse posts from the entire community.

Rich Media Uploads: Post text, images, or both! I hooked this up with Cloudinary so your image uploads are securely hosted and won't disappear when the server restarts.

Social Interactions: Follow your favorite creators, drop likes, and jump into the comment sections.

Snappy Chat: Search for users and start a private conversation. The chat polls for new messages in the background to give you that real-time texting feel.

Custom Profiles: Scope out other users' profiles to see their recent posts, or check your own follower/following stats.

Light & Dark Mode: A globally managed theme toggle that instantly switches the vibe and saves your eyes.

🛠️ Under the Hood I went with the MERN stack for this one, adding a few modern tools to keep things fast and reliable:

Frontend: React.js bootstrapped with Vite (because it's insanely fast), React Router, and the Context API to manage global states like user auth and themes.

Backend: Node.js and Express.js keeping the API endpoints running smoothly.

Database: MongoDB, modeled using Mongoose.

Storage: Cloudinary handles all the heavy lifting for image hosting.

Styling: 100% Vanilla CSS! I decided to skip the heavy frameworks this time and lean entirely into modern CSS variables, Flexbox, and Grid.

💻 Running It Locally Want to pull down the code and run it on your own machine? Here is the step-by-step to get you rolling.

Prerequisites Before you start, make sure you have Node.js installed, a MongoDB database ready to go (Atlas is perfect), a free Cloudinary account, and a Gmail account with an "App Password" generated for sending those OTP emails.

Backend Setup Open your terminal and navigate into the backend directory: cd backend

Install the necessary dependencies: npm install

Create a .env file right inside the backend folder and paste in your secrets:

Code snippet PORT=5000 MONGO_URI=your_mongodb_connection_string JWT_SECRET=your_super_secret_jwt_key SMTP_USER=your_gmail_address SMTP_PASS=your_gmail_app_password CLOUDINARY_CLOUD_NAME=your_cloudinary_name CLOUDINARY_API_KEY=your_cloudinary_api_key CLOUDINARY_API_SECRET=your_cloudinary_api_secret Fire up the development server: npm run dev (It will boot up on port 5000).

Frontend Setup Open a fresh terminal tab and navigate into the frontend directory: cd frontend

Install the frontend dependencies: npm install

Start the Vite server: npm run dev

That is it! Just open http://localhost:5174 in your browser, and you should be looking at your very own local instance of Tech Connect. Have fun exploring the code!
