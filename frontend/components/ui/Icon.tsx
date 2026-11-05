"use client";

import React from 'react';
import {
  User,
  Users,
  Activity,
  ShieldCheck,
  AlertCircle,
  ShieldAlert,
  Accessibility,
  Flag,
  CheckCircle2,
  Eye,
  Pencil,
  Plus,
  Trash2,
  Save,
  X,
  ArrowLeft,
  ArrowRight,
  Search,
  RefreshCw,
  Check,
  LogOut,
  Clock,
  AlertTriangle,
  CheckCircle,
  Lock,
  Unlock,
  Shield,
  Heart,
  Building,
  ClipboardList,
  Home,
  Calendar,
  FileText,
  Phone,
  MapPin,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  HelpCircle,
  Wifi,
  WifiOff,
  LucideProps,
} from 'lucide-react';

export type IconName =
  // Section Icons (A - H, J)
  | 'sec-a'
  | 'sec-b'
  | 'sec-c'
  | 'sec-d'
  | 'sec-e'
  | 'sec-f'
  | 'sec-g'
  | 'sec-h'
  | 'sec-j'
  | 'User'
  | 'Users'
  | 'Activity'
  | 'ShieldCheck'
  | 'AlertCircle'
  | 'ShieldAlert'
  | 'Accessibility'
  | 'Flag'
  | 'CheckCircle2'
  // Action Icons
  | 'view'
  | 'edit'
  | 'add'
  | 'delete'
  | 'save'
  | 'cancel'
  | 'back'
  | 'forward'
  | 'search'
  | 'refresh'
  | 'check'
  | 'logout'
  | 'calendar'
  | 'file'
  | 'phone'
  | 'location'
  | 'chevron-down'
  | 'chevron-up'
  | 'download'
  | 'share'
  | 'help'
  // Status Icons
  | 'due'
  | 'overdue'
  | 'completed'
  | 'locked'
  | 'pending';

interface IconProps extends Omit<LucideProps, 'ref'> {
  name: IconName | string;
  className?: string;
  size?: number | string;
  'aria-hidden'?: boolean | 'true' | 'false';
}

export const Icon: React.FC<IconProps> = ({
  name,
  className = 'w-4 h-4',
  size,
  'aria-hidden': ariaHidden = true,
  ...props
}) => {
  const commonProps = {
    className,
    size: size ? Number(size) : undefined,
    'aria-hidden': ariaHidden,
    ...props,
  };

  switch (name) {
    // Sections
    case 'sec-a':
    case 'User':
      return <User {...commonProps} />;
    case 'sec-b':
    case 'Users':
      return <Users {...commonProps} />;
    case 'sec-c':
    case 'Activity':
      return <Activity {...commonProps} />;
    case 'sec-d':
    case 'ShieldCheck':
      return <ShieldCheck {...commonProps} />;
    case 'sec-e':
    case 'AlertCircle':
      return <AlertCircle {...commonProps} />;
    case 'sec-f':
    case 'ShieldAlert':
      return <ShieldAlert {...commonProps} />;
    case 'sec-g':
    case 'Accessibility':
      return <Accessibility {...commonProps} />;
    case 'sec-h':
    case 'Flag':
      return <Flag {...commonProps} />;
    case 'sec-j':
    case 'CheckCircle2':
      return <CheckCircle2 {...commonProps} />;

    // Actions
    case 'view':
      return <Eye {...commonProps} />;
    case 'edit':
      return <Pencil {...commonProps} />;
    case 'add':
    case 'Plus':
    case 'plus':
      return <Plus {...commonProps} />;
    case 'delete':
      return <Trash2 {...commonProps} />;
    case 'save':
      return <Save {...commonProps} />;
    case 'cancel':
      return <X {...commonProps} />;
    case 'back':
      return <ArrowLeft {...commonProps} />;
    case 'forward':
      return <ArrowRight {...commonProps} />;
    case 'search':
      return <Search {...commonProps} />;
    case 'refresh':
      return <RefreshCw {...commonProps} />;
    case 'check':
    case 'Check':
      return <Check {...commonProps} />;
    case 'logout':
    case 'LogOut':
      return <LogOut {...commonProps} />;
    case 'calendar':
    case 'Calendar':
      return <Calendar {...commonProps} />;
    case 'file':
    case 'FileText':
      return <FileText {...commonProps} />;
    case 'phone':
    case 'Phone':
      return <Phone {...commonProps} />;
    case 'location':
    case 'MapPin':
      return <MapPin {...commonProps} />;
    case 'chevron-down':
    case 'ChevronDown':
      return <ChevronDown {...commonProps} />;
    case 'chevron-up':
    case 'ChevronUp':
      return <ChevronUp {...commonProps} />;
    case 'chevron-left':
    case 'ChevronLeft':
      return <ChevronLeft {...commonProps} />;
    case 'chevron-right':
    case 'ChevronRight':
      return <ChevronRight {...commonProps} />;
    case 'download':
      return <Download {...commonProps} />;
    case 'share':
      return <Share2 {...commonProps} />;
    case 'help':
      return <HelpCircle {...commonProps} />;
    case 'wifi':
    case 'Wifi':
      return <Wifi {...commonProps} />;
    case 'wifi-off':
    case 'WifiOff':
      return <WifiOff {...commonProps} />;

    // Statuses
    case 'due':
    case 'pending':
      return <Clock {...commonProps} />;
    case 'overdue':
      return <AlertTriangle {...commonProps} />;
    case 'completed':
      return <CheckCircle {...commonProps} />;
    case 'locked':
    case 'Lock':
      return <Lock {...commonProps} />;
    case 'unlock':
    case 'Unlock':
      return <Unlock {...commonProps} />;
    case 'Shield':
      return <Shield {...commonProps} />;
    case 'Heart':
      return <Heart {...commonProps} />;
    case 'Building':
      return <Building {...commonProps} />;
    case 'ClipboardList':
      return <ClipboardList {...commonProps} />;
    case 'Home':
      return <Home {...commonProps} />;
    case 'x':
      return <X {...commonProps} />;
    case 'info':
    case 'Info':
      return <AlertCircle {...commonProps} />;
    case 'check-circle':
    case 'CheckCircle':
      return <CheckCircle {...commonProps} />;

    default:
      return <FileText {...commonProps} />;
  }
};
