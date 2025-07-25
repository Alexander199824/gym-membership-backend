// scripts/verify-oauth-config.js - Script para verificar configuración OAuth (CORREGIDO)
require('dotenv').config();

const checkGoogleOAuthConfig = () => {
  console.log('🔍 Verificando configuración de Google OAuth...\n');

  const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET', 
    'GOOGLE_CALLBACK_URL'
  ];

  const optionalVars = [
    'FRONTEND_ADMIN_URL',
    'FRONTEND_CLIENT_URL',
    'FRONTEND_URL'
  ];

  let allGood = true;

  // ✅ Verificar variables requeridas
  console.log('📋 Variables requeridas:');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      console.log(`   ❌ ${varName}: No configurado`);
      allGood = false;
    } else if (value.startsWith('your_') || value.includes('placeholder')) {
      console.log(`   ⚠️ ${varName}: Tiene valor placeholder - ${value.substring(0, 30)}...`);
      allGood = false;
    } else {
      const displayValue = varName === 'GOOGLE_CLIENT_SECRET' 
        ? '***************' 
        : value.length > 50 
          ? value.substring(0, 50) + '...' 
          : value;
      console.log(`   ✅ ${varName}: ${displayValue}`);
    }
  });

  // ✅ Verificar variables opcionales
  console.log('\n🔗 URLs de redirección:');
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      console.log(`   ⚠️ ${varName}: No configurado (se usará valor por defecto)`);
    } else {
      console.log(`   ✅ ${varName}: ${value}`);
    }
  });

  // ✅ Validaciones específicas
  console.log('\n🛡️ Validaciones específicas:');
  
  // Client ID debe ser de Google
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (clientId && clientId.includes('.apps.googleusercontent.com')) {
    console.log('   ✅ GOOGLE_CLIENT_ID tiene formato válido de Google');
  } else if (clientId) {
    console.log('   ❌ GOOGLE_CLIENT_ID no parece ser un ID válido de Google');
    allGood = false;
  }

  // Callback URL debe coincidir con la configuración del servidor
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL;
  const expectedCallback = `http://localhost:${process.env.PORT || 5000}/api/auth/google/callback`;
  if (callbackUrl === expectedCallback) {
    console.log('   ✅ GOOGLE_CALLBACK_URL coincide con la configuración del servidor');
  } else if (callbackUrl) {
    console.log(`   ⚠️ GOOGLE_CALLBACK_URL configurado como: ${callbackUrl}`);
    console.log(`   💡 Valor esperado: ${expectedCallback}`);
    console.log('   📝 Asegúrate de que coincida con Google Console');
  }

  // Verificar coherencia de URLs
  const frontendUrl = process.env.FRONTEND_URL;
  const adminUrl = process.env.FRONTEND_ADMIN_URL;
  const clientUrl = process.env.FRONTEND_CLIENT_URL;

  if (frontendUrl && adminUrl && clientUrl) {
    console.log('   ✅ Todas las URLs de frontend configuradas');
  } else {
    console.log('   ⚠️ Algunas URLs de frontend no configuradas (se usarán valores por defecto)');
  }

  // ✅ Verificar configuración en Google Console
  console.log('\n🌐 Configuración requerida en Google Console:');
  console.log('   📍 Authorized JavaScript origins:');
  console.log(`      - http://localhost:3000`);
  console.log(`      - http://localhost:5000`);
  if (adminUrl && adminUrl !== frontendUrl) {
    console.log(`      - ${adminUrl}`);
  }
  
  console.log('   📍 Authorized redirect URIs:');
  console.log(`      - ${callbackUrl || expectedCallback}`);

  // ✅ Resumen final
  console.log('\n📊 Resumen de configuración:');
  if (allGood) {
    console.log('   🎉 ¡Configuración completa y válida!');
    console.log('   🚀 Google OAuth debería funcionar correctamente');
    
    console.log('\n🧪 Para probar la configuración:');
    console.log('   1. Inicia el servidor: npm start');
    console.log('   2. Ve a: http://localhost:5000/api/auth/services');
    console.log('   3. Verifica que googleOAuth.enabled sea true');
    console.log('   4. Prueba el login: http://localhost:5000/api/auth/google');
  } else {
    console.log('   ❌ Configuración incompleta o incorrecta');
    console.log('   🔧 Revisa los elementos marcados arriba');
    
    console.log('\n💡 Pasos para completar la configuración:');
    console.log('   1. Ve a Google Cloud Console');
    console.log('   2. Crea credenciales OAuth 2.0');
    console.log('   3. Configura las URLs autorizadas');
    console.log('   4. Copia las credenciales al archivo .env');
  }

  return allGood;
};

const checkPassportConfig = () => {
  console.log('\n🔐 Verificando configuración de Passport...');
  
  try {
    // ✅ CORREGIDO: Ruta correcta para el módulo de passport
    const passport = require('./src/config/passport');
    
    if (passport.availableStrategies) {
      console.log('   📋 Estrategias disponibles:');
      Object.entries(passport.availableStrategies).forEach(([strategy, available]) => {
        const status = available ? '✅' : '❌';
        console.log(`      ${status} ${strategy}: ${available ? 'Disponible' : 'No disponible'}`);
      });
      
      if (passport.availableStrategies.google) {
        console.log('   🎉 Estrategia de Google configurada correctamente');
        return true;
      } else {
        console.log('   ⚠️ Estrategia de Google no disponible');
        return false;
      }
    } else {
      console.log('   ❌ No se pudo verificar las estrategias de Passport');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error al cargar configuración de Passport: ${error.message}`);
    
    // ✅ NUEVO: Diagnóstico más detallado
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('   💡 Posibles causas:');
      console.log('      - El archivo src/config/passport.js no existe');
      console.log('      - Faltan dependencias (npm install)');
      console.log('      - El script se ejecuta desde un directorio incorrecto');
    }
    
    return false;
  }
};

// ✅ NUEVO: Verificar si los archivos necesarios existen
const checkFileStructure = () => {
  console.log('\n📂 Verificando estructura de archivos...');
  
  const fs = require('fs');
  const path = require('path');
  
  const requiredFiles = [
    './src/config/passport.js',
    './src/models/User.js',
    './.env'
  ];
  
  let allFilesExist = true;
  
  requiredFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${filePath}: Existe`);
    } else {
      console.log(`   ❌ ${filePath}: No encontrado`);
      allFilesExist = false;
    }
  });
  
  return allFilesExist;
};

const generateQuickTest = () => {
  console.log('\n🧪 URLs de prueba rápida:');
  console.log(`   🔍 Configuración OAuth: http://localhost:${process.env.PORT || 5000}/api/auth/oauth-config`);
  console.log(`   🔍 Servicios disponibles: http://localhost:${process.env.PORT || 5000}/api/auth/services`);
  console.log(`   🔍 Health check: http://localhost:${process.env.PORT || 5000}/api/health`);
  console.log(`   🔐 Login con Google: http://localhost:${process.env.PORT || 5000}/api/auth/google`);
  
  console.log('\n📝 Comandos de prueba con curl:');
  console.log('```bash');
  console.log(`curl http://localhost:${process.env.PORT || 5000}/api/auth/oauth-config`);
  console.log(`curl http://localhost:${process.env.PORT || 5000}/api/auth/services`);
  console.log('```');
};

// ✅ Ejecutar verificación
const main = () => {
  console.log('🔧 VERIFICADOR DE CONFIGURACIÓN GOOGLE OAUTH (v2.0)');
  console.log('===================================================\n');
  
  const filesOk = checkFileStructure();
  const envOk = checkGoogleOAuthConfig();
  const passportOk = checkPassportConfig();
  
  generateQuickTest();
  
  console.log('\n===================================================');
  if (filesOk && envOk && passportOk) {
    console.log('🎉 ¡CONFIGURACIÓN COMPLETA Y LISTA PARA USAR!');
    console.log('🚀 Google OAuth funcionará correctamente');
    process.exit(0);
  } else {
    console.log('❌ CONFIGURACIÓN INCOMPLETA - Revisa los errores arriba');
    
    if (!filesOk) {
      console.log('💡 Ejecuta este comando desde la raíz del proyecto');
    }
    
    process.exit(1);
  }
};

// Solo ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { checkGoogleOAuthConfig, checkPassportConfig, checkFileStructure };