// src/config/passport.js
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const { User } = require('../models');

// Serialización de usuario
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Estrategia Local (siempre disponible)
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await User.findByEmail(email);
    
    if (!user) {
      return done(null, false, { message: 'Email no registrado' });
    }

    if (!user.isActive) {
      return done(null, false, { message: 'Cuenta desactivada' });
    }

    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return done(null, false, { message: 'Contraseña incorrecta' });
    }

    // Actualizar último login
    user.lastLogin = new Date();
    await user.save();

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Estrategia Google OAuth (solo si está configurado)
const hasValidGoogleConfig = 
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL &&
  process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id.apps.googleusercontent.com';

if (hasValidGoogleConfig) {
  console.log('✅ Configurando Google OAuth Strategy');
  
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Buscar usuario existente por Google ID
      let user = await User.findByGoogleId(profile.id);
      
      if (user) {
        // Usuario existe, actualizar último login
        user.lastLogin = new Date();
        await user.save();
        return done(null, user);
      }

      // Buscar por email si no existe por Google ID
      user = await User.findByEmail(profile.emails[0].value);
      
      if (user) {
        // Usuario existe con email, vincular Google ID
        user.googleId = profile.id;
        user.emailVerified = true;
        user.lastLogin = new Date();
        await user.save();
        return done(null, user);
      }

      // Crear nuevo usuario
      user = await User.create({
        googleId: profile.id,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        email: profile.emails[0].value,
        profileImage: profile.photos[0]?.value,
        emailVerified: true,
        lastLogin: new Date(),
        role: 'cliente'
      });

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
} else {
  console.warn('⚠️ Google OAuth no configurado - El login con Google no estará disponible');
  console.warn('   Variables requeridas: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL');
}

// Estrategia JWT (siempre disponible)
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
}, async (payload, done) => {
  try {
    const user = await User.findByPk(payload.id);
    
    if (user && user.isActive) {
      return done(null, user);
    }
    
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

// Exportar información sobre qué estrategias están disponibles
passport.availableStrategies = {
  local: true,
  google: hasValidGoogleConfig,
  jwt: true
};

module.exports = passport;