import React, { useState, useEffect, useRef } from 'react';
import type { UserAccount } from '../types/auth';
import { 
  User, 
  Camera, 
  Upload, 
  Trash2, 
  Lock, 
  KeyRound, 
  Smartphone, 
  Mail, 
  ShieldCheck, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  ExternalLink,
  Send
} from 'lucide-react';
import { SelfieCameraModal } from './SelfieCameraModal';
import {
  updateUserProfileApi,
  sendProfileOtpApi,
  resetProfilePasswordApi,
  getWhatsAppConfigApi,
  saveWhatsAppConfigApi,
  connectWhatsAppInstanceApi,
  getWhatsAppInstanceStatusApi,
  disconnectWhatsAppInstanceApi,
  sendWhatsAppTestMessageApi,
} from '../services/api';

interface ConfiguracionPageProps {
  currentUser: UserAccount;
  onUpdateCurrentUser: (user: UserAccount) => void;
  initialTab?: 'mi-perfil' | 'whatsapp-evolution';
}

type SettingsTab = 'mi-perfil' | 'whatsapp-evolution';

export const ConfiguracionPage: React.FC<ConfiguracionPageProps> = ({
  currentUser,
  onUpdateCurrentUser,
  initialTab,
}) => {
  const isSuperAdmin = Boolean(
    currentUser.isSuperAdmin || 
    currentUser.level === 'admin' ||
    currentUser.accountRoleLabel?.toLowerCase().includes('super') ||
    currentUser.email?.toLowerCase().includes('usrubenroqueguzman') ||
    currentUser.id === 'usr-superadmin' ||
    currentUser.id === 'usr-admin'
  );
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || 'mi-perfil');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // --- ESTADOS DE MI PERFIL ---
  const [name, setName] = useState(currentUser.name || '');
  const [username, setUsername] = useState(currentUser.username ? currentUser.username.replace(/^@+/, '') : '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [aboutMe, setAboutMe] = useState(currentUser.aboutMe || '');
  const [picture, setPicture] = useState<string | null>(currentUser.picture || null);
  
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- ESTADOS DE REESTABLECER CONTRASEÑA ---
  const [validationMethod, setValidationMethod] = useState<'whatsapp' | 'current_password'>('whatsapp');
  const [currentPassword, setCurrentPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSentFeedback, setOtpSentFeedback] = useState<string | null>(null);
  const [otpFallbackLink, setOtpFallbackLink] = useState<string | null>(null);
  const [otpCountdown, setOtpCountdown] = useState<number>(0);

  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [passSuccessMsg, setPassSuccessMsg] = useState<string | null>(null);
  const [passErrorMsg, setPassErrorMsg] = useState<string | null>(null);

  // --- ESTADOS DE WHATSAPP / EVOLUTION API (SUPERADMIN) ---
  const [waApiUrl, setWaApiUrl] = useState('');
  const [waApiKey, setWaApiKey] = useState('');
  const [waInstanceName, setWaInstanceName] = useState('validador-territorial');
  const [waCountryCode, setWaCountryCode] = useState('52');
  const [waStatus, setWaStatus] = useState<'open' | 'connecting' | 'close' | 'unconfigured' | 'error'>('unconfigured');
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [waSaveMsg, setWaSaveMsg] = useState<string | null>(null);
  const [waErrorMsg, setWaErrorMsg] = useState<string | null>(null);

  // Test de WhatsApp
  const [testNumber, setTestNumber] = useState('');
  const [testMessage, setTestMessage] = useState('✅ Prueba de conexión exitosa desde VERTEX Electoral.');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  // Sincronizar datos iniciales del usuario
  useEffect(() => {
    setName(currentUser.name || '');
    setUsername(currentUser.username ? currentUser.username.replace(/^@+/, '') : '');
    setPhone(currentUser.phone || '');
    setEmail(currentUser.email || '');
    setAboutMe(currentUser.aboutMe || '');
    setPicture(currentUser.picture || null);
  }, [currentUser]);

  // Manejador del temporizador para reenvío de OTP
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Cargar configuración de WhatsApp al entrar (si es Superadmin)
  useEffect(() => {
    if (isSuperAdmin) {
      loadWhatsAppConfig();
      checkWhatsAppStatus();
    }
  }, [isSuperAdmin]);

  const loadWhatsAppConfig = async () => {
    const config = await getWhatsAppConfigApi();
    if (config) {
      setWaApiUrl(config.apiUrl || '');
      setWaInstanceName(config.instanceName || 'validador-territorial');
      setWaCountryCode(config.countryCode || '52');
    }
  };

  const checkWhatsAppStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const res = await getWhatsAppInstanceStatusApi();
      if (res && res.state) {
        setWaStatus(res.state);
        if (res.state === 'open') {
          setQrCodeBase64(null); // Ocultar QR si ya está conectado
        }
      } else {
        setWaStatus('unconfigured');
      }
    } catch {
      setWaStatus('error');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // --- SUBIR / PROCESAR FOTO SELFIE ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG o WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPicture(result);
      setProfileSuccessMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureSelfie = (base64Image: string) => {
    setPicture(base64Image);
    setProfileSuccessMsg(null);
  };

  const handleRemovePhoto = () => {
    setPicture(null);
  };

  // --- GUARDAR PERFIL ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    const cleanName = name.trim();
    const cleanUser = username.trim().toLowerCase().replace(/^@+/, '');
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanAbout = aboutMe.trim();

    if (!cleanName) {
      setProfileErrorMsg('El nombre es obligatorio.');
      setIsSavingProfile(false);
      return;
    }

    try {
      const res = await updateUserProfileApi({
        id: currentUser.id,
        name: cleanName,
        username: cleanUser,
        email: cleanEmail,
        phone: cleanPhone,
        aboutMe: cleanAbout,
        picture: picture || null,
      });

      if (res.success && res.user) {
        const updatedUser: UserAccount = {
          ...currentUser,
          ...res.user,
          username: cleanUser,
          picture: picture || undefined,
          phone: cleanPhone || undefined,
          aboutMe: cleanAbout || undefined,
        };

        onUpdateCurrentUser(updatedUser);

        // Actualizar en localStorage para consistencia inmediata
        try {
          localStorage.setItem('territorial_auth_user', JSON.stringify(updatedUser));
          const savedCustom = localStorage.getItem('territorial_custom_accounts');
          if (savedCustom) {
            const parsed = JSON.parse(savedCustom);
            if (Array.isArray(parsed)) {
              const updated = parsed.map((a: UserAccount) => 
                (a.id === updatedUser.id || a.email === updatedUser.email) ? { ...a, ...updatedUser } : a
              );
              localStorage.setItem('territorial_custom_accounts', JSON.stringify(updated));
            }
          }
        } catch {}

        setProfileSuccessMsg('¡Datos de perfil y foto selfie actualizados correctamente!');
        setTimeout(() => setProfileSuccessMsg(null), 4000);
      } else {
        setProfileErrorMsg(res.error || 'No se pudo guardar la información del perfil.');
      }
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Error de conexión al guardar perfil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --- SOLICITAR CÓDIGO OTP POR WHATSAPP ---
  const handleRequestOtp = async () => {
    const cleanDigits = phone.replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length < 10) {
      alert('Por favor ingresa primero un número de teléfono móvil de 10 dígitos y guarda tu perfil.');
      return;
    }

    setIsSendingOtp(true);
    setOtpSentFeedback(null);
    setOtpFallbackLink(null);
    setPassErrorMsg(null);

    try {
      const res = await sendProfileOtpApi(cleanDigits);
      if (res.success) {
        setOtpSentFeedback(res.message || 'Código de seguridad generado con éxito.');
        if (res.waLink) {
          setOtpFallbackLink(res.waLink);
        }
        setOtpCountdown(60); // 60 segundos antes de permitir reenvío
      } else {
        setPassErrorMsg(res.error || 'No se pudo enviar el código de verificación.');
      }
    } catch {
      setPassErrorMsg('Error de conexión al solicitar el código de verificación.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // --- CAMBIAR CONTRASEÑA ---
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassSuccessMsg(null);
    setPassErrorMsg(null);

    if (newPassword.length < 6) {
      setPassErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassErrorMsg('Las contraseñas no coinciden. Verifica que estén escritas idénticas.');
      return;
    }

    if (validationMethod === 'whatsapp' && !otpCode.trim()) {
      setPassErrorMsg('Por favor introduce el código de 6 dígitos recibido por WhatsApp.');
      return;
    }

    if (validationMethod === 'current_password' && !currentPassword.trim()) {
      setPassErrorMsg('Por favor introduce tu contraseña actual.');
      return;
    }

    setIsResettingPassword(true);

    try {
      const res = await resetProfilePasswordApi({
        currentPassword: validationMethod === 'current_password' ? currentPassword.trim() : undefined,
        otpCode: validationMethod === 'whatsapp' ? otpCode.trim() : undefined,
        newPassword: newPassword.trim(),
      });

      if (res.success) {
        setPassSuccessMsg('¡Contraseña actualizada con éxito! Tu nueva clave ya está activa.');
        setCurrentPassword('');
        setOtpCode('');
        setNewPassword('');
        setConfirmPassword('');
        setOtpSentFeedback(null);
        setOtpFallbackLink(null);

        // Actualizar en localStorage si correspondía
        try {
          const savedCustom = localStorage.getItem('territorial_custom_accounts');
          if (savedCustom) {
            const parsed = JSON.parse(savedCustom);
            if (Array.isArray(parsed)) {
              const updated = parsed.map((a: UserAccount) => 
                (a.id === currentUser.id || a.email === currentUser.email) ? { ...a, password: newPassword.trim() } : a
              );
              localStorage.setItem('territorial_custom_accounts', JSON.stringify(updated));
            }
          }
        } catch {}
      } else {
        setPassErrorMsg(res.error || 'Error al actualizar la contraseña.');
      }
    } catch {
      setPassErrorMsg('Error de conexión al procesar el cambio de contraseña.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // --- GUARDAR CONFIGURACIÓN EVOLUTION API ---
  const handleSaveWhatsAppConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaSaveMsg(null);
    setWaErrorMsg(null);

    try {
      const res = await saveWhatsAppConfigApi({
        apiUrl: waApiUrl.trim(),
        apiKey: waApiKey.trim() || undefined,
        instanceName: waInstanceName.trim(),
        countryCode: waCountryCode.trim(),
        autoOtpEnabled: true,
      });

      if (res.success) {
        setWaSaveMsg('Configuración guardada correctamente.');
        checkWhatsAppStatus();
        setTimeout(() => setWaSaveMsg(null), 3000);
      } else {
        setWaErrorMsg(res.error || 'Error al guardar la configuración.');
      }
    } catch {
      setWaErrorMsg('Error de conexión al guardar configuración de WhatsApp.');
    }
  };

  // --- SOLICITAR CÓDIGO QR PARA VINCULAR INSTANCIA ---
  const handleConnectWhatsApp = async () => {
    setIsLoadingQr(true);
    setWaErrorMsg(null);
    try {
      const res = await connectWhatsAppInstanceApi();
      if (res.success) {
        if (res.qrcode) {
          setQrCodeBase64(res.qrcode);
          setWaStatus('connecting');
        } else if (res.isAlreadyOpen) {
          setWaStatus('open');
          setQrCodeBase64(null);
          alert('¡La instancia ya se encuentra conectada a WhatsApp!');
        } else {
          setWaStatus('connecting');
          setWaSaveMsg('Instancia iniciada. Esperando generación de QR...');
        }
      } else {
        setWaErrorMsg(res.error || 'Error al solicitar código QR a Evolution API.');
      }
    } catch {
      setWaErrorMsg('No fue posible contactar a Evolution API. Verifica que la URL y la API Key sean correctas.');
    } finally {
      setIsLoadingQr(false);
    }
  };

  // --- DESCONECTAR INSTANCIA ---
  const handleDisconnectWhatsApp = async () => {
    if (!window.confirm('¿Deseas desconectar el teléfono vinculado a esta instancia de WhatsApp?')) {
      return;
    }
    try {
      await disconnectWhatsAppInstanceApi();
      setQrCodeBase64(null);
      setWaStatus('close');
      alert('Instancia desconectada.');
    } catch {
      alert('Error al desconectar la instancia.');
    }
  };

  // --- ENVIAR MENSAJE DE PRUEBA ---
  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testNumber.trim()) {
      alert('Ingresa el número al que deseas enviar el mensaje de prueba.');
      return;
    }

    setIsSendingTest(true);
    setTestFeedback(null);
    try {
      const res = await sendWhatsAppTestMessageApi(testNumber.trim(), testMessage.trim());
      if (res.success) {
        setTestFeedback('✅ Mensaje de prueba enviado con éxito a WhatsApp.');
      } else {
        setTestFeedback(`❌ Error: ${res.error || 'No se pudo entregar el mensaje'}`);
      }
    } catch {
      setTestFeedback('❌ Error de conexión al enviar mensaje de prueba.');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto font-sans">
      {/* Header Limpio con Guinda Institucional */}
      <div className="bg-white border-b border-slate-200 px-6 sm:px-8 py-5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Configuración
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Administración de perfil de usuario, credenciales y validación en dos pasos
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-1 bg-[#9d2449]/10 text-[#9d2449] border border-[#9d2449]/20">
              {currentUser.accountRoleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Selector Horizontal de Pestañas Superior (Para acceso rápido y directo) */}
      <div className="bg-white border-b border-slate-200 px-6 sm:px-8 py-3 flex items-center gap-2 overflow-x-auto shrink-0 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('mi-perfil')}
          className={`px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'mi-perfil'
              ? 'bg-[#9d2449] text-white shadow-xs'
              : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Mi Perfil</span>
        </button>

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('whatsapp-evolution')}
            className={`px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'whatsapp-evolution'
                ? 'bg-[#9d2449] text-white shadow-xs'
                : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Validación WhatsApp (Evolution API & QR)</span>
            {waStatus === 'open' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>
        )}
      </div>

      {/* Contenedor Principal con Barra Lateral Interna */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          
          {/* BARRA LATERAL INTERNA (SUB-SIDEBAR) */}
          <aside className="w-full md:w-64 shrink-0 bg-white border border-slate-200 p-2 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Opciones de Cuenta
            </div>

            {/* 1. Mi Perfil (Para TODAS las cuentas de todos los niveles) */}
            <button
              type="button"
              onClick={() => setActiveTab('mi-perfil')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 text-left transition-all cursor-pointer ${
                activeTab === 'mi-perfil'
                  ? 'bg-[#9d2449] text-white font-bold shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 font-medium'
              }`}
            >
              <User className={`w-4 h-4 shrink-0 ${activeTab === 'mi-perfil' ? 'text-white' : 'text-[#9d2449]'}`} />
              <div className="min-w-0">
                <div className="text-xs">Mi Perfil</div>
                <div className={`text-[10px] truncate ${activeTab === 'mi-perfil' ? 'text-white/80' : 'text-slate-400'}`}>
                  Foto, datos y contraseña
                </div>
              </div>
            </button>

            {/* 2. Validación WhatsApp (Evolution API) - Sólo Superadmin */}
            {isSuperAdmin && (
              <>
                <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Infraestructura
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('whatsapp-evolution')}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 text-left transition-all cursor-pointer ${
                    activeTab === 'whatsapp-evolution'
                      ? 'bg-[#9d2449] text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <MessageSquare className={`w-4 h-4 shrink-0 ${activeTab === 'whatsapp-evolution' ? 'text-white' : 'text-emerald-600'}`} />
                  <div className="min-w-0">
                    <div className="text-xs flex items-center gap-1.5">
                      <span>Validación WhatsApp</span>
                      {waStatus === 'open' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <div className={`text-[10px] truncate ${activeTab === 'whatsapp-evolution' ? 'text-white/80' : 'text-slate-400'}`}>
                      QR & Evolution API
                    </div>
                  </div>
                </button>
              </>
            )}
          </aside>

          {/* ÁREA DE CONTENIDO */}
          <main className="flex-1 w-full space-y-6">

            {/* TAB: MI PERFIL */}
            {activeTab === 'mi-perfil' && (
              <div className="space-y-6">
                
                {/* BLOQUE 1: DATOS DE USUARIO & FOTO SELFIE */}
                <div className="bg-white border border-slate-200 p-6 sm:p-7 space-y-6 shadow-xs">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <User className="w-5 h-5 text-[#9d2449]" />
                      <span>Información Personal y Foto Selfie</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Gestiona tu fotografía oficial de perfil y los datos de contacto asociados a tu cuenta.
                    </p>
                  </div>

                  {profileSuccessMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>{profileSuccessMsg}</span>
                    </div>
                  )}

                  {profileErrorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{profileErrorMsg}</span>
                    </div>
                  )}

                  {/* FOTO SELFIE */}
                  <div className="p-4 bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-5">
                    <div className="relative w-28 h-28 shrink-0 bg-slate-200 border-2 border-slate-300 overflow-hidden flex items-center justify-center">
                      {picture ? (
                        <img
                          src={picture}
                          alt="Foto selfie"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                          <User className="w-10 h-10" />
                          <span className="text-[10px]">Sin foto</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-center sm:text-left flex-1">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Foto Selfie / Perfil
                      </h4>
                      <p className="text-[11px] text-slate-500 max-w-md">
                        Puedes subir una fotografía desde tu dispositivo o abrir tu cámara web para tomar una selfie directamente.
                      </p>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsCameraModalOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-[#9d2449] hover:bg-[#831e3d] text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Tomar selfie con cámara</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                          <span>Subir archivo</span>
                        </button>

                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />

                        {picture && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="flex items-center gap-1.5 px-2.5 py-2 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                            title="Quitar foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Quitar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* FORMULARIO DE DATOS */}
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Nombre */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Nombre Completo *
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Tu nombre completo"
                          className="w-full px-3 py-2.5 bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#9d2449]"
                        />
                      </div>

                      {/* Nombre de usuario */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Nombre de Usuario
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs font-bold">
                            @
                          </span>
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                            placeholder="usuario"
                            className="w-full pl-7 pr-3 py-2.5 bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#9d2449]"
                          />
                        </div>
                      </div>

                      {/* Teléfono */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Teléfono Móvil (WhatsApp) *
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                            <Smartphone className="w-3.5 h-3.5" />
                          </div>
                          <input
                            type="tel"
                            maxLength={10}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                            placeholder="10 dígitos (ej. 9931234567)"
                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#9d2449]"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Este número se usará para recibir códigos de seguridad y validación por WhatsApp.
                        </p>
                      </div>

                      {/* Correo Electrónico */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Correo Electrónico
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                            <Mail className="w-3.5 h-3.5" />
                          </div>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="correo@ejemplo.com"
                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#9d2449]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Acerca de mí */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Acerca de mí
                      </label>
                      <textarea
                        rows={3}
                        value={aboutMe}
                        onChange={(e) => setAboutMe(e.target.value)}
                        placeholder="Describe brevemente tus funciones, trayectoria o notas personales sobre tu labor territorial..."
                        className="w-full px-3 py-2.5 bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#9d2449]"
                      />
                    </div>

                    {/* Información no editable de Demarcación */}
                    <div className="p-3 bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-slate-500">Demarcación asignada: </span>
                        <strong className="text-slate-800">{currentUser.territoryName || 'Nivel Central'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Nivel de estructura: </span>
                        <span className="px-2 py-0.5 bg-slate-200 font-semibold text-slate-700 text-[11px]">
                          {currentUser.level}
                        </span>
                      </div>
                    </div>

                    {/* Botón Guardar */}
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isSavingProfile}
                        className="px-6 py-2.5 bg-[#9d2449] hover:bg-[#831e3d] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {isSavingProfile ? 'Guardando...' : 'Guardar Cambios de Perfil'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* BLOQUE 2: REESTABLECER CONTRASEÑA CON VALIDACIÓN WHATSAPP */}
                <div className="bg-white border border-slate-200 p-6 sm:p-7 space-y-5 shadow-xs">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-[#9d2449]" />
                      <span>Seguridad y Reestablecer Contraseña</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Para garantizar la integridad de tu cuenta, valida tu identidad mediante un código de seguridad enviado a tu WhatsApp o ingresando tu contraseña actual.
                    </p>
                  </div>

                  {passSuccessMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>{passSuccessMsg}</span>
                    </div>
                  )}

                  {passErrorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{passErrorMsg}</span>
                    </div>
                  )}

                  {/* Selector de Método de Verificación */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setValidationMethod('whatsapp')}
                      className={`p-3.5 border text-left transition-all cursor-pointer flex items-start gap-3 ${
                        validationMethod === 'whatsapp'
                          ? 'border-[#9d2449] bg-[#9d2449]/5 ring-1 ring-[#9d2449]'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <MessageSquare className={`w-5 h-5 shrink-0 mt-0.5 ${validationMethod === 'whatsapp' ? 'text-[#9d2449]' : 'text-slate-400'}`} />
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          Código de Seguridad por WhatsApp
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Recibe un código PIN de 6 dígitos en tu teléfono registrado.
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setValidationMethod('current_password')}
                      className={`p-3.5 border text-left transition-all cursor-pointer flex items-start gap-3 ${
                        validationMethod === 'current_password'
                          ? 'border-[#9d2449] bg-[#9d2449]/5 ring-1 ring-[#9d2449]'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <KeyRound className={`w-5 h-5 shrink-0 mt-0.5 ${validationMethod === 'current_password' ? 'text-[#9d2449]' : 'text-slate-400'}`} />
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          Contraseña Actual
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Autoriza el cambio ingresando tu clave vigente.
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Formulario de Contraseña */}
                  <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
                    
                    {/* Sección Código WhatsApp */}
                    {validationMethod === 'whatsapp' && (
                      <div className="p-4 bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">
                              Validación Telefónica
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Teléfono destino: <strong>{phone || 'No registrado'}</strong>
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={isSendingOtp || otpCountdown > 0 || !phone}
                            onClick={handleRequestOtp}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shrink-0 flex items-center justify-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>
                              {isSendingOtp
                                ? 'Enviando...'
                                : otpCountdown > 0
                                ? `Reenviar en ${otpCountdown}s`
                                : 'Enviar código a mi WhatsApp'}
                            </span>
                          </button>
                        </div>

                        {otpSentFeedback && (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center justify-between gap-2">
                            <span>{otpSentFeedback}</span>
                            {otpFallbackLink && (
                              <a
                                href={otpFallbackLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 font-bold underline hover:text-emerald-950"
                              >
                                <span>Abrir enlace</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Ingresa el Código de 6 dígitos recibido:
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="Ej. 123456"
                            className="w-full sm:w-48 px-3 py-2 bg-white border border-slate-300 text-center font-mono text-sm tracking-widest text-slate-900 focus:outline-none focus:border-[#9d2449]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Sección Contraseña Actual */}
                    {validationMethod === 'current_password' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Contraseña Actual *
                        </label>
                        <input
                          type="password"
                          required
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Tu clave actual"
                          className="w-full px-3 py-2.5 bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#9d2449]"
                        />
                      </div>
                    )}

                    {/* Nueva Contraseña y Confirmación */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Nueva Contraseña (mínimo 6 caracteres) *
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            minLength={6}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Nueva clave"
                            className="w-full pr-9 pl-3 py-2.5 bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#9d2449]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Confirmar Nueva Contraseña *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repite la nueva clave"
                          className="w-full px-3 py-2.5 bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#9d2449]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isResettingPassword}
                        className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {isResettingPassword ? 'Actualizando clave...' : 'Actualizar Contraseña'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TAB: VALIDACIÓN WHATSAPP (EVOLUTION API - SUPERADMIN) */}
            {activeTab === 'whatsapp-evolution' && isSuperAdmin && (
              <div className="space-y-6">
                
                {/* ESTADO DE CONEXIÓN */}
                <div className="bg-white border border-slate-200 p-6 sm:p-7 space-y-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-emerald-600" />
                        <span>Instancia WhatsApp para Códigos de Validación (Evolution API)</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Vincula el teléfono que servirá como bot o validador para enviar códigos OTP de forma 100% gratuita.
                      </p>
                    </div>

                    {/* Estado Badge */}
                    <div className="flex items-center gap-2 shrink-0">
                      {waStatus === 'open' ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Conectado / En Línea</span>
                        </span>
                      ) : waStatus === 'connecting' ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                          <span>Esperando Escaneo QR</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span>Desconectado</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={checkWhatsAppStatus}
                        disabled={isCheckingStatus}
                        className="p-1.5 border border-slate-300 hover:bg-slate-100 text-slate-600 transition-colors"
                        title="Verificar estado de conexión"
                      >
                        <RefreshCw className={`w-4 h-4 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {waSaveMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>{waSaveMsg}</span>
                    </div>
                  )}

                  {waErrorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{waErrorMsg}</span>
                    </div>
                  )}

                  {/* PARÁMETROS DE EVOLUTION API */}
                  <form onSubmit={handleSaveWhatsAppConfig} className="p-4 bg-slate-50 border border-slate-200 space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Parámetros de Servidor Evolution API
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          URL del Servidor Evolution API *
                        </label>
                        <input
                          type="text"
                          required
                          value={waApiUrl}
                          onChange={(e) => setWaApiUrl(e.target.value)}
                          placeholder="http://evolution-api:8080 o https://..."
                          className="w-full px-3 py-2 bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#9d2449]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          API Key de Evolution API *
                        </label>
                        <input
                          type="password"
                          value={waApiKey}
                          onChange={(e) => setWaApiKey(e.target.value)}
                          placeholder="Token de autenticación de Evolution"
                          className="w-full px-3 py-2 bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#9d2449]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Nombre de la Instancia
                        </label>
                        <input
                          type="text"
                          value={waInstanceName}
                          onChange={(e) => setWaInstanceName(e.target.value)}
                          placeholder="validador-territorial"
                          className="w-full px-3 py-2 bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#9d2449]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Guardar Parámetros
                      </button>
                    </div>
                  </form>

                  {/* SECCIÓN VINCULACIÓN CON CÓDIGO QR */}
                  <div className="p-5 border border-slate-200 bg-white space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          Vincular Teléfono mediante Código QR
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Genera el código QR para escanearlo con la app de WhatsApp de tu teléfono móvil.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {waStatus !== 'open' ? (
                          <button
                            type="button"
                            disabled={isLoadingQr || !waApiUrl}
                            onClick={handleConnectWhatsApp}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#9d2449] hover:bg-[#831e3d] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQr ? 'animate-spin' : ''}`} />
                            <span>{isLoadingQr ? 'Generando QR...' : 'Conectar / Obtener Código QR'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleDisconnectWhatsApp}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            Desvincular Teléfono
                          </button>
                        )}
                      </div>
                    </div>

                    {/* VISUALIZADOR DE QR */}
                    {qrCodeBase64 && waStatus !== 'open' && (
                      <div className="p-6 bg-slate-50 border border-slate-300 flex flex-col items-center justify-center space-y-4">
                        <div className="bg-white p-3 border border-slate-300 shadow-md">
                          <img
                            src={qrCodeBase64}
                            alt="Código QR WhatsApp"
                            className="w-64 h-64 object-contain"
                          />
                        </div>

                        <div className="text-center space-y-1 max-w-sm">
                          <p className="text-xs font-bold text-slate-800">
                            Apunta con la cámara de WhatsApp a este código QR
                          </p>
                          <ol className="text-[11px] text-slate-600 text-left list-decimal pl-5 space-y-1">
                            <li>Abre WhatsApp en el celular del validador.</li>
                            <li>Toca en <strong>Ajustes</strong> o <strong>Dispositivos vinculados</strong>.</li>
                            <li>Toca en <strong>Vincular un dispositivo</strong> y escanea este QR.</li>
                          </ol>
                        </div>

                        <button
                          type="button"
                          onClick={checkWhatsAppStatus}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          Ya escaneé el QR (Verificar Conexión)
                        </button>
                      </div>
                    )}

                    {waStatus === 'open' && (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
                        <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                        <div className="text-xs">
                          <strong>¡Teléfono conectado y activo!</strong> Esta instancia enviará automáticamente los códigos OTP de seguridad a los números móviles registrados por los coordinadores.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PRUEBA DE ENVÍO */}
                  <form onSubmit={handleSendTestMessage} className="p-4 bg-slate-50 border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Prueba de Envío en Vivo
                    </h4>

                    {testFeedback && (
                      <div className="p-2.5 bg-white border border-slate-300 text-xs">
                        {testFeedback}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Número destino (con o sin lada 52)
                        </label>
                        <input
                          type="tel"
                          value={testNumber}
                          onChange={(e) => setTestNumber(e.target.value)}
                          placeholder="Ej. 9931234567"
                          className="w-full px-3 py-2 bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#9d2449]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Mensaje de prueba
                        </label>
                        <input
                          type="text"
                          value={testMessage}
                          onChange={(e) => setTestMessage(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#9d2449]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isSendingTest || waStatus !== 'open'}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        {isSendingTest ? 'Enviando...' : 'Enviar WhatsApp de Prueba'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* MODAL DE CÁMARA WEB PARA FOTO SELFIE */}
      <SelfieCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCaptureSelfie}
      />

      {/* Pie de página pequeño */}
      <footer className="mt-auto py-3 px-6 border-t border-slate-200/60 bg-white text-center">
        <a
          href="https://www.instagram.com/rubenroqueguzman/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          Creado por: Rubén Roque Guzmán
        </a>
      </footer>
    </div>
  );
};
