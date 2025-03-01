import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"
import clsx from "clsx"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const variantStyles = {
      primary: "bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500",
      secondary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
      outline: "border border-purple-300 bg-transparent text-purple-700 hover:bg-purple-50 focus:ring-purple-500",
      ghost: "bg-transparent text-purple-700 hover:bg-purple-100 focus:ring-purple-500",
    }

    const sizeStyles = {
      sm: "py-1.5 px-3 text-xs",
      md: "py-2 px-4 text-sm",
      lg: "py-2.5 px-5 text-base",
    }

    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth ? "w-full" : "",
          className,
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    )
  },
)

Button.displayName = "Button"

export default Button

