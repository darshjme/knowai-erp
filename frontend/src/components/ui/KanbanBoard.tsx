import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

/**
 * KanbanBoard - Reusable Kanban board using @hello-pangea/dnd.
 */
export default function KanbanBoard({
  columns = [],
  onDragEnd,
  renderCard,
  className = '',
}) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className={`flex gap-4 overflow-x-auto pb-2 min-h-[400px] items-start ${className}`} data-testid="kanban-board">
        {columns.map((col) => (
          <div className="flex-none w-[280px] min-w-[280px] bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] flex flex-col max-h-[calc(100vh-200px)]" key={col.id}>
            {/* Column Header */}
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-[var(--border-default)]">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: col.color || 'var(--text-muted)' }}
                />
                <span className="text-[13px] font-bold text-[var(--text-primary)] uppercase tracking-wide">{col.title}</span>
                <span className="text-[11px] font-semibold text-[var(--text-muted)] bg-[var(--border-default)] rounded-[10px] px-2 py-px leading-snug">{col.items?.length || 0}</span>
              </div>
            </div>

            {/* Droppable Area */}
            <Droppable droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 p-2 overflow-y-auto min-h-[60px] transition-colors flex flex-col gap-2 ${snapshot.isDraggingOver ? 'bg-[#7C3AED]/5' : ''}`}
                >
                  {col.items?.map((item, index) => (
                    <Draggable
                      key={item.id || item._id || `${col.id}-${index}`}
                      draggableId={String(item.id || item._id || `${col.id}-${index}`)}
                      index={index}
                    >
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg transition-shadow cursor-grab hover:shadow-md ${dragSnapshot.isDragging ? 'shadow-xl rotate-[2deg] cursor-grabbing' : ''}`}
                          style={{
                            ...dragProvided.draggableProps.style,
                          }}
                        >
                          {renderCard ? renderCard(item, index) : (
                            <div className="p-3 text-[13px] text-[var(--text-primary)]">
                              {item.title || item.name || 'Untitled'}
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  {(!col.items || col.items.length === 0) && !snapshot.isDraggingOver && (
                    <div className="flex items-center justify-center py-6 px-3 text-[12px] text-[var(--text-muted)] opacity-50">No items</div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
