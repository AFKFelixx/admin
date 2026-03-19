// supabase-client.js
(function() {
    // Your Supabase project credentials
    const supabaseUrl = 'https://ormkzcbrhvpwruadvzua.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ybWt6Y2JyaHZwd3J1YWR2enVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NDUyMjMsImV4cCI6MjA4OTQyMTIyM30.mEXwx3O_JYmznGEmvEFTL3n5Jt1D9xqOXC4eHPoysp0';

    // Check if the Supabase library is loaded
    if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
        console.error('Supabase library not loaded or createClient missing. Check that the script tag for supabase-js is included and placed before this file.');
        // Optionally, you could create a dummy object to prevent crashes, but better to let the error be visible.
        window.supabase = null;
        return;
    }

    try {
        // Create the Supabase client
        const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

        // Attach it to window so it's globally available
        window.supabase = supabase;

        console.log('Supabase client initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        window.supabase = null;
    }
})();
