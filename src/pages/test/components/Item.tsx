import React, { useEffect } from "react"
import type { DraggableSyntheticListeners } from "@dnd-kit/core"
import type { Transform } from "@dnd-kit/utilities"
import styles from "./Item.module.css"

export interface Props {
  dragOverlay?: boolean
  disabled?: boolean
  dragging?: boolean
  handle?: boolean
  handleProps?: any
  height?: number
  index?: number
  transform?: Transform | null
  listeners?: DraggableSyntheticListeners
  sorting?: boolean
  style?: React.CSSProperties
  transition?: string | null
  wrapperStyle?: React.CSSProperties
  value: React.ReactNode
  renderItem?(args: {
    dragOverlay: boolean
    dragging: boolean
    sorting: boolean
    index: number | undefined
    listeners: DraggableSyntheticListeners
    ref: React.Ref<HTMLElement>
    style: React.CSSProperties | undefined
    transform: Props["transform"]
    transition: Props["transition"]
    value: Props["value"]
  }): React.ReactElement
}

export const Item = React.memo(
  React.forwardRef<HTMLLIElement, Props>(
    (
      {
        dragOverlay,
        dragging,
        disabled,
        handle,
        handleProps,
        height,
        index,
        listeners,
        renderItem,
        sorting,
        style,
        transition,
        transform,
        value,
        wrapperStyle,
        ...props
      },
      ref
    ) => {
      console.log()
      return renderItem ? (
        renderItem({
          dragOverlay: Boolean(dragOverlay),
          dragging: Boolean(dragging),
          sorting: Boolean(sorting),
          index,
          listeners,
          ref,
          style,
          transform,
          transition,
          value
        })
      ) : (
        <li
          className={`transform-gpu list-none`}
          style={
            {
              ...wrapperStyle,
              transition: [transition, wrapperStyle?.transition]
                .filter(Boolean)
                .join(", "),
              "--tw-translate-x": transform
                ? `${Math.round(transform.x)}px`
                : undefined,
              "--tw-translate-y": transform
                ? `${Math.round(transform.y)}px`
                : undefined,
              "--tw-scale-x": transform?.scaleX
                ? `${transform.scaleX}`
                : undefined,
              "--tw-scale-y": transform?.scaleY
                ? `${transform.scaleY}`
                : undefined,
              "--index": index
            } as React.CSSProperties
          }
          ref={ref}
        >
          <div
            className={`relative flex grow items-center p-5 bg-white shadow-md rounded-md list-none origin-center ${
              dragging && "opacity-50"
            } `}
            style={style}
            data-cypress="draggable-item"
            {...(!handle ? listeners : undefined)}
            {...props}
            tabIndex={!handle ? 0 : undefined}
          >
            <span>{value}</span>
          </div>
        </li>
      )
    }
  )
)
