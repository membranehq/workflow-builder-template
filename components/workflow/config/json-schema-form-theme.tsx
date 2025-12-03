"use client";

import type {
  RJSFSchema,
  WidgetProps,
  FieldProps,
  ArrayFieldTemplateProps,
} from "@rjsf/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Custom text input widget
export function CustomTextWidget(props: WidgetProps) {
  const { id, value, onChange, required, disabled, label, placeholder, schema } =
    props;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label || schema.title}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {schema.description && (
        <p className="text-muted-foreground text-xs">{schema.description}</p>
      )}
      <Input
        id={id}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder || `Enter ${label || schema.title || "value"}`}
        required={required}
      />
    </div>
  );
}

// Custom textarea widget
export function CustomTextareaWidget(props: WidgetProps) {
  const { id, value, onChange, required, disabled, label, placeholder, schema } =
    props;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label || schema.title}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {schema.description && (
        <p className="text-muted-foreground text-xs">{schema.description}</p>
      )}
      <Textarea
        id={id}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder || `Enter ${label || schema.title || "value"}`}
        required={required}
        rows={4}
      />
    </div>
  );
}

// Custom select widget
export function CustomSelectWidget(props: WidgetProps) {
  const { id, value, onChange, required, disabled, label, schema, options } =
    props;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label || schema.title}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {schema.description && (
        <p className="text-muted-foreground text-xs">{schema.description}</p>
      )}
      <Select
        value={value || ""}
        onValueChange={onChange}
        disabled={disabled}
        required={required}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder={`Select ${label || schema.title || "option"}`} />
        </SelectTrigger>
        <SelectContent>
          {options.enumOptions?.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Custom date widget
export function CustomDateWidget(props: WidgetProps) {
  const { id, value, onChange, required, disabled, label, schema } = props;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label || schema.title}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {schema.description && (
        <p className="text-muted-foreground text-xs">{schema.description}</p>
      )}
      <Input
        id={id}
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
      />
    </div>
  );
}

// Custom datetime widget
export function CustomDateTimeWidget(props: WidgetProps) {
  const { id, value, onChange, required, disabled, label, schema } = props;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label || schema.title}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {schema.description && (
        <p className="text-muted-foreground text-xs">{schema.description}</p>
      )}
      <Input
        id={id}
        type="datetime-local"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
      />
    </div>
  );
}

// Custom time widget
export function CustomTimeWidget(props: WidgetProps) {
  const { id, value, onChange, required, disabled, label, schema } = props;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label || schema.title}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {schema.description && (
        <p className="text-muted-foreground text-xs">{schema.description}</p>
      )}
      <Input
        id={id}
        type="time"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
      />
    </div>
  );
}

// Custom checkbox widget for boolean fields
export function CustomCheckboxWidget(props: WidgetProps) {
  const { id, value, onChange, required, disabled, label, schema } = props;

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox
          id={id}
          checked={value || false}
          onCheckedChange={onChange}
          disabled={disabled}
          required={required}
        />
        <Label
          htmlFor={id}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label || schema.title}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      </div>
      {schema.description && (
        <p className="text-muted-foreground text-xs ml-6">{schema.description}</p>
      )}
    </div>
  );
}

// Custom field template to handle layout
export function CustomFieldTemplate(props: FieldProps) {
  const { id, children, errors, help, description, hidden, required, displayLabel } = props;

  if (hidden) {
    return <div className="hidden">{children}</div>;
  }

  return (
    <div className="mb-4">
      {children}
      {errors && (
        <div className="mt-1 text-xs text-destructive">
          {errors}
        </div>
      )}
      {help && (
        <div className="mt-1 text-xs text-muted-foreground">
          {help}
        </div>
      )}
    </div>
  );
}

// Custom array field template
export function CustomArrayFieldTemplate(props: ArrayFieldTemplateProps) {
  const {
    title,
    items,
    canAdd,
    onAddClick,
    required,
    schema,
    disabled,
    readonly,
  } = props;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>
          {title || schema.title}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {canAdd && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddClick}
            disabled={disabled || readonly}
            className="h-7"
          >
            <Plus className="size-3 mr-1" />
            Add Item
          </Button>
        )}
      </div>
      {schema.description && (
        <p className="text-muted-foreground text-xs">{schema.description}</p>
      )}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-muted-foreground text-sm py-4 text-center border border-dashed rounded-md">
            No items yet. Click "Add Item" to get started.
          </div>
        ) : (
          items.map((element) => element)
        )}
      </div>
    </div>
  );
}

