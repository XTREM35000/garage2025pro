import React from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';

interface IntegratedFormProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}

export function IntegratedForm({ children, onSubmit, className = '' }: IntegratedFormProps) {
  return (
    <form onSubmit={onSubmit} className={`space-y-4 ${className}`}>
      {children}
    </form>
  );
}

interface IntegratedFieldProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export function IntegratedField({ 
  label, 
  name, 
  type = 'text', 
  placeholder, 
  required, 
  value, 
  onChange,
  className = ''
}: IntegratedFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

export { Button as IntegratedButton };