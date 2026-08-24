import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement>{
  size?: number;
  color?: string;
}

export const PlusIcon: React.FC<IconProps>= ({ size = 20, color = 'currentColor', ...props }) =>(
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
   <path d="M10 4v12M4 10h12" />
 </svg>);

export const SearchIcon: React.FC<IconProps>= ({ size = 16, color = 'currentColor', ...props }) =>(
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
   <circle cx="7" cy="7" r="4.4" />
   <path d="M10.3 10.3L14 14" />
 </svg>);

export const ChevronRightIcon: React.FC<IconProps>= ({ size = 16, color = 'currentColor', ...props }) =>(
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
   <path d="M6 3.5L10.5 8L6 12.5" />
 </svg>);

export const ChevronLeftIcon: React.FC<IconProps>= ({ size = 20, color = 'currentColor', ...props }) =>(
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
   <path d="M11.5 5L6 10l5.5 5" />
 </svg>);

export const ChevronDownIcon: React.FC<IconProps>= ({ size = 14, color = 'currentColor', ...props }) =>(
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
   <path d="M3.5 5.5L7 9l3.5-3.5" />
 </svg>);

export const CalendarIcon: React.FC<IconProps>= ({ size = 20, color = 'currentColor', ...props }) =>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
   <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
   <line x1="16" y1="2" x2="16" y2="6" />
   <line x1="8" y1="2" x2="8" y2="6" />
   <line x1="3" y1="10" x2="21" y2="10" />
 </svg>);

export const UsersIcon: React.FC<IconProps>= ({ size = 20, color = 'currentColor', ...props }) =>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
   <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
   <circle cx="9" cy="7" r="4" />
   <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
   <path d="M16 3.13a4 4 0 0 1 0 7.75" />
 </svg>);

export const SunIcon: React.FC<IconProps>= ({ size = 20, color = 'currentColor', ...props }) =>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
   <circle cx="12" cy="12" r="5" />
   <line x1="12" y1="1" x2="12" y2="3" />
   <line x1="12" y1="21" x2="12" y2="23" />
   <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
   <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
   <line x1="1" y1="12" x2="3" y2="12" />
   <line x1="21" y1="12" x2="23" y2="12" />
   <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
   <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
 </svg>);

export const MoreIcon: React.FC<IconProps>= ({ size = 20, color = 'currentColor', ...props }) =>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
   <circle cx="12" cy="12" r="1" />
   <circle cx="12" cy="5" r="1" />
   <circle cx="12" cy="19" r="1" />
 </svg>);

export const MoreHorizontalIcon: React.FC<IconProps>= ({ size = 18, color = 'currentColor', ...props }) =>(
  <svg width={size} height={size} viewBox="0 0 18 18" fill={color} {...props}>
   <circle cx="4" cy="9" r="1.5" />
   <circle cx="9" cy="9" r="1.5" />
   <circle cx="14" cy="9" r="1.5" />
 </svg>);

export const WhatsAppIcon: React.FC<IconProps>= ({ size = 18, color = 'currentColor', ...props }) =>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
   <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
 </svg>);

export const CheckIcon: React.FC<IconProps>= ({ size = 16, color = 'currentColor', ...props }) =>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
   <polyline points="20 6 9 17 4 12" />
 </svg>);

export const ClockIcon: React.FC<IconProps>= ({ size = 16, color = 'currentColor', ...props }) =>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
   <circle cx="12" cy="12" r="10" />
   <polyline points="12 6 12 12 16 14" />
 </svg>);

export const ExternalLinkIcon: React.FC<IconProps>= ({ size = 14, color = 'currentColor', ...props }) =>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
   <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
   <polyline points="15 3 21 3 21 9" />
   <line x1="10" y1="14" x2="21" y2="3" />
 </svg>);
