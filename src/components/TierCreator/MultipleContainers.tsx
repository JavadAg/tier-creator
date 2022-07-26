import React, { useEffect, useRef, useState } from "react"
import { createPortal, unstable_batchedUpdates } from "react-dom"
import {
  CancelDrop,
  DndContext,
  DragOverlay,
  DropAnimation,
  MouseSensor,
  TouchSensor,
  Modifiers,
  UniqueIdentifier,
  useSensors,
  useSensor,
  MeasuringStrategy,
  KeyboardCoordinateGetter,
  defaultDropAnimationSideEffects
} from "@dnd-kit/core"
import {
  AnimateLayoutChanges,
  SortableContext,
  useSortable,
  arrayMove,
  defaultAnimateLayoutChanges,
  verticalListSortingStrategy,
  SortingStrategy,
  horizontalListSortingStrategy,
  rectSortingStrategy
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Container, ContainerProps } from "./Container"
import { IoAddCircleOutline } from "react-icons/io5"
import { Item } from "./Item"
import TierModal from "./TierCreatorModal"
import { colorPickerOptions } from "./ContainerEditModal"
import { Image, Template } from "../../types/template.types"

interface States {
  [key: string]: Image[]
}

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true })

function DroppableContainer({
  children,
  disabled,
  id,
  items,
  style,
  ...props
}: ContainerProps & {
  disabled?: boolean
  id: string
  items: Image[]
  style?: React.CSSProperties
}) {
  const {
    active,
    attributes,
    isDragging,
    listeners,
    over,
    setNodeRef,
    transition,
    index,
    transform
  } = useSortable({
    id,
    data: {
      type: "container",
      children: items
    },
    animateLayoutChanges
  })
  const isOverContainer = over
    ? (id === over.id && active?.data.current?.type !== "container") ||
      items.some((obj) => obj.id === over.id)
    : false

  return (
    <Container
      index={index}
      ref={disabled ? undefined : setNodeRef}
      color={getColor(index)}
      style={{
        ...style,
        transition,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : undefined
      }}
      hover={isOverContainer}
      handleProps={{
        ...attributes,
        ...listeners
      }}
      {...props}
    >
      {children}
    </Container>
  )
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5"
      }
    }
  })
}

type Items = Record<UniqueIdentifier, UniqueIdentifier[]>

interface Props {
  template: Template
  containerStyle?: React.CSSProperties
  coordinateGetter?: KeyboardCoordinateGetter
  getItemStyles?(args: {
    value: UniqueIdentifier
    index: number
    overIndex: number
    isDragging: boolean
    containerId: UniqueIdentifier
    isSorting: boolean
    isDragOverlay: boolean
  }): React.CSSProperties
  wrapperStyle?(args: { index: number }): React.CSSProperties
  itemCount?: number
  items?: Items
  strategy?: SortingStrategy
  modifiers?: Modifiers
  scrollable?: boolean
  vertical?: boolean
}

const PLACEHOLDER_ID = "placeholder"

export function MultipleContainers({
  template,
  getItemStyles = () => ({}),
  wrapperStyle = () => ({}),
  vertical = true
}: Props) {
  console.log()
  const fieldsRef = useRef<HTMLDivElement>(null)

  const [backgroundColor, setBackgroundColor] = useState<string>("#222")

  const arrayOfImages = template.image

  let allRows = {}

  let labels = []

  for (const iterator of template.rows) {
    const label = iterator.label.trim()
    allRows = { ...allRows, [label]: [] }
    labels.push(label)
  }
  labels.push(...labels.splice(0))

  useEffect(() => window.scrollTo(0, 0), [])

  const states: States = { ...allRows, default: arrayOfImages }

  const [items, setItems] = useState<States>(states)

  const [containers, setContainers] = useState<string[]>(labels)

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)

  const recentlyMovedToNewContainer = useRef(false)

  const isSortingContainer = activeId
    ? containers.includes(activeId as string)
    : false

  const [clonedItems, setClonedItems] = useState<States | null>(null)

  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor))

  const findContainer = (id: UniqueIdentifier) => {
    if (id in items) {
      return id
    }

    return Object.keys(items).find((key) =>
      items[key].some((item) => item.id === id)
    )
  }

  const findItemByActiveId = (id: UniqueIdentifier) => {
    const item = Object.values(items)
      .flat()
      .find((item) => item.id == id)
    return item!.url
  }

  const getIndex = (id: UniqueIdentifier) => {
    const container = findContainer(id)

    if (!container) {
      return -1
    }

    const index = items[container as string].findIndex(
      (obj) => obj.id == (id as number)
    )

    return index
  }

  const onDragCancel = () => {
    if (clonedItems) {
      // Reset items to their original state in case items have been
      // Dragged across containers
      setItems(clonedItems)
    }

    setActiveId(null)
    setClonedItems(null)
  }

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false
    })
  }, [items])

  return (
    <DndContext
      autoScroll={false}
      sensors={sensors}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always
        }
      }}
      onDragStart={({ active }) => {
        setActiveId(active.id)
        setClonedItems(items)
      }}
      onDragOver={({ active, over }) => {
        const overId = over?.id

        if (overId == null || active.id in items) {
          return
        }

        const overContainer = findContainer(overId)
        const activeContainer = findContainer(active.id)

        if (!overContainer || !activeContainer) {
          return
        }

        if (activeContainer !== overContainer) {
          setItems((items: States) => {
            const activeItems = items[activeContainer]
            const overItems = items[overContainer]
            const overIndex = overItems
              .map((object: Image) => object.id)
              .indexOf(overId as number)

            const activeIndex = activeItems
              .map((object: Image) => object.id)
              .indexOf(active.id as number)

            let newIndex: number

            if (overId in items) {
              newIndex = overItems.length + 1
            } else {
              const isBelowOverItem =
                over &&
                active.rect.current.translated &&
                active.rect.current.translated.top >
                  over.rect.top + over.rect.height

              const modifier = isBelowOverItem ? 1 : 0

              newIndex =
                overIndex >= 0 ? overIndex + modifier : overItems.length + 1
            }

            recentlyMovedToNewContainer.current = true

            return {
              ...items,
              [activeContainer]: items[activeContainer].filter(
                (item: Image) => item.id !== active.id
              ),

              [overContainer]: [
                ...items[overContainer].slice(0, newIndex),
                items[activeContainer][activeIndex],
                ...items[overContainer].slice(
                  newIndex,
                  items[overContainer].length
                )
              ]
            }
          })
        }
      }}
      onDragEnd={({ active, over }) => {
        if (active.id in items && over?.id) {
          setContainers((containers: string[]) => {
            const activeIndex = containers.indexOf(active.id as string)

            const overIndex = containers.indexOf(over.id as string)

            return arrayMove(containers, activeIndex, overIndex)
          })
        }

        const activeContainer = findContainer(active.id)

        if (!activeContainer) {
          setActiveId(null)
          return
        }

        const overId = over?.id

        if (overId == null) {
          setActiveId(null)
          return
        }

        if (overId === PLACEHOLDER_ID) {
          const newContainerId = getNextContainerId()

          unstable_batchedUpdates(() => {
            setContainers((containers: string[]) => [
              ...containers,
              newContainerId
            ])
            setItems((items) => ({
              ...items,
              [activeContainer]: items[activeContainer].filter(
                (item) => item.id !== activeId
              ) as Image[],
              [newContainerId]: [active.id] as unknown as Image[]
            }))
            setActiveId(null)
          })
          return
        }

        const overContainer = findContainer(overId)

        if (overContainer) {
          const activeIndex = items[activeContainer]
            .map((object: Image) => object.id)
            .indexOf(active.id as number)

          const overIndex = items[overContainer]
            .map((object: Image) => object.id)
            .indexOf(overId as number)

          if (activeIndex !== overIndex) {
            setItems((items: States) => ({
              ...items,
              [overContainer]: arrayMove(
                items[overContainer],
                activeIndex,
                overIndex
              )
            }))
          }
        }

        setActiveId(null)
      }}
      onDragCancel={onDragCancel}
    >
      <div className={`flex flex-col w-full max-w-[1100px]`}>
        <div
          className="border border-gray-220 divide-y divide-gray-220"
          style={{ backgroundColor: backgroundColor }}
          ref={fieldsRef}
        >
          <SortableContext
            items={[...containers]}
            strategy={
              vertical
                ? verticalListSortingStrategy
                : horizontalListSortingStrategy
            }
          >
            {containers.map((containerId: string) => (
              <DroppableContainer
                key={containerId}
                id={containerId}
                templateName={template.slug}
                label={containerId}
                items={items[containerId]}
                onRemove={() => handleRemove(containerId)}
              >
                <SortableContext
                  items={items[containerId]}
                  strategy={rectSortingStrategy}
                >
                  {items[containerId].map((value: Image, index: number) => {
                    return (
                      <SortableItem
                        disabled={isSortingContainer}
                        key={value.id}
                        id={value.id}
                        value={value.url}
                        index={index}
                        style={getItemStyles}
                        wrapperStyle={wrapperStyle}
                        containerId={containerId}
                        getIndex={getIndex}
                      />
                    )
                  })}
                </SortableContext>
              </DroppableContainer>
            ))}
          </SortableContext>
        </div>
        <DroppableContainer
          key={"default"}
          id={"default"}
          templateName={template.slug}
          label={"default"}
          items={items["default"]}
          onRemove={() => handleRemove("default")}
        >
          <SortableContext
            items={items["default"]}
            strategy={rectSortingStrategy}
          >
            {items["default"].map((value: Image, index: number) => {
              return (
                <SortableItem
                  disabled={isSortingContainer}
                  key={value.id}
                  id={value.id}
                  value={value.url}
                  index={index}
                  style={getItemStyles}
                  wrapperStyle={wrapperStyle}
                  containerId={"default"}
                  getIndex={getIndex}
                />
              )
            })}
          </SortableContext>
        </DroppableContainer>

        {containers.length !== 10 ? (
          <button
            data-mdb-ripple="true"
            data-mdb-ripple-color="light"
            className="bg-white hover:bg-gray-50 duration-200 border border-gray-300 p-1 self-center my-2 rounded-md text-xl dark:bg-gray-700 dark:hover:bg-gray-900 dark:border-gray-800 dark:text-gray-200"
            onClick={handleAddColumn}
          >
            <IoAddCircleOutline />
          </button>
        ) : null}
        <button
          data-mdb-ripple="true"
          data-mdb-ripple-color="light"
          className="flex justify-center items-center text-sm space-x-1 bg-indigo-100 focus:bg-indigo-200 hover:bg-indigo-200 active:bg-indigo-300 w-52 py-1.5 rounded-md text-grey-900 border border-indigo-100 leading-tight focus:outline-none focus:ring-0   transition self-center duration-150 ease-in-out sm:w-56 md:w-60 xl:w-64 xl:text-[.9rem] mb-2"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#changecolor"
          aria-expanded="false"
          aria-controls="changecolor"
        >
          Change Background Color
        </button>
        <div className="collapse" id="changecolor">
          <div className="block p-2 mb-2 border border-gray-200 shadow-200 rounded bg-white dark:bg-gray-700 dark:border-gray-600">
            {colorPickerOptions.map((item: string, index: number) => (
              <button
                key={index}
                value={item}
                onClick={handlecolor}
                style={{ backgroundColor: item }}
                className={`m-2 py-4 px-4  rounded-full`}
              ></button>
            ))}
          </div>
        </div>

        <TierModal
          getFieldsDetails={getFieldsDetails}
          id={fieldsRef}
          template={template}
        />
      </div>

      {createPortal(
        <DragOverlay adjustScale={false} dropAnimation={dropAnimation}>
          {activeId
            ? containers.includes(activeId as string)
              ? renderContainerDragOverlay(activeId)
              : renderSortableItemDragOverlay(activeId)
            : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  )

  function renderSortableItemDragOverlay(id: UniqueIdentifier) {
    return <Item value={findItemByActiveId(id)} dragOverlay />
  }

  function renderContainerDragOverlay(containerId: UniqueIdentifier) {
    return (
      <Container label={containerId as string} shadow>
        {items[containerId].map((item: Image, index: number) => (
          <Item key={item.id} value={item.url} />
        ))}
      </Container>
    )
  }
  function handleRemove(containerID: UniqueIdentifier) {
    setContainers((containers: string[]) =>
      containers.filter((id) => id !== containerID)
    )
  }

  function handleAddColumn() {
    const newContainerId = getNextContainerId()

    unstable_batchedUpdates(() => {
      let placeholder = containers
      placeholder.splice(placeholder.length, 0, newContainerId)
      setContainers(placeholder)
      setItems((items) => ({
        ...items,
        [newContainerId]: []
      }))
    })
  }

  function handlecolor(e: React.MouseEvent<HTMLButtonElement>) {
    setBackgroundColor(e.currentTarget.value)
  }

  function getFieldsDetails() {
    let colors: string[] = []
    let labels: string[] = []
    let templateImages: string[][] = []
    let fieldsbgcolor: string = backgroundColor
    const fields = fieldsRef.current

    Object.values(fields!.childNodes).map(
      (item: any) => (
        labels.push(item.innerText),
        colors.push(item.childNodes[0].style.backgroundColor),
        templateImages.push(
          Object.values(item.childNodes[1].childNodes)?.map(
            (child: any) => child.childNodes[0].currentSrc
          )
        )
      )
    )
    return { colors, labels, templateImages, fieldsbgcolor }
  }

  function getNextContainerId() {
    const containerIds = Object.keys(items)
    const lastContainerId = containerIds[containerIds.length - 1]

    return String.fromCharCode(lastContainerId.charCodeAt(0) + 1)
  }
}

function getColor(id: UniqueIdentifier) {
  switch (String(id)[0]) {
    case "0":
      return "#FF7F7F"
    case "1":
      return "#FFBF7F"
    case "2":
      return "#FFDF7F"
    case "3":
      return "#FFFE7F"
    case "4":
      return "#BFFE7E"
  }

  return "#ccc"
}

interface SortableItemProps {
  containerId: UniqueIdentifier
  id: UniqueIdentifier
  value: UniqueIdentifier
  index: number
  disabled?: boolean
  style(args: any): React.CSSProperties
  getIndex(id: UniqueIdentifier): number
  wrapperStyle({ index }: { index: number }): React.CSSProperties
}

function SortableItem({
  disabled,
  id,
  index,
  value,
  style,
  containerId,
  getIndex,
  wrapperStyle
}: SortableItemProps) {
  const {
    setNodeRef,
    listeners,
    isDragging,
    isSorting,
    over,
    overIndex,
    transform,
    transition
  } = useSortable({
    id
  })

  return (
    <Item
      ref={disabled ? undefined : setNodeRef}
      value={value}
      dragging={isDragging}
      sorting={isSorting}
      index={index}
      wrapperStyle={wrapperStyle({ index })}
      style={style({
        index,
        value: id,
        isDragging,
        isSorting,
        overIndex: over ? getIndex(over.id) : overIndex,
        containerId
      })}
      transition={transition}
      transform={transform}
      listeners={listeners}
    />
  )
}
