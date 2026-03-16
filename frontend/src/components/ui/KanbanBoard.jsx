import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

/**
 * KanbanBoard - Reusable Kanban board using @hello-pangea/dnd.
 *
 * @param {Object}    props
 * @param {Array}     props.columns    - Array of { id, title, color, items: [] }
 * @param {Function}  props.onDragEnd  - (result) => void - standard @hello-pangea/dnd result
 * @param {Function}  props.renderCard - (item, index) => ReactNode
 * @param {string}    [props.className]
 */
export default function KanbanBoard({
  columns = [],
  onDragEnd,
  renderCard,
  className = '',
}) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className={`kai-kanban ${className}`}>
        {columns.map((col) => (
          <div className="kai-kanban__column" key={col.id}>
            {/* Column Header */}
            <div className="kai-kanban__col-header">
              <div className="kai-kanban__col-header-left">
                <span
                  className="kai-kanban__col-dot"
                  style={{ background: col.color || 'var(--kai-silver, #4C5963)' }}
                />
                <span className="kai-kanban__col-title">{col.title}</span>
                <span className="kai-kanban__col-count">{col.items?.length || 0}</span>
              </div>
            </div>

            {/* Droppable Area */}
            <Droppable droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`kai-kanban__drop-zone ${snapshot.isDraggingOver ? 'kai-kanban__drop-zone--over' : ''}`}
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
                          className={`kai-kanban__card ${dragSnapshot.isDragging ? 'kai-kanban__card--dragging' : ''}`}
                          style={{
                            ...dragProvided.draggableProps.style,
                          }}
                        >
                          {renderCard ? renderCard(item, index) : (
                            <div className="kai-kanban__card-default">
                              {item.title || item.name || 'Untitled'}
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  {(!col.items || col.items.length === 0) && !snapshot.isDraggingOver && (
                    <div className="kai-kanban__empty">No items</div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>

      <style>{`
        .kai-kanban {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding-bottom: 8px;
          min-height: 400px;
          align-items: flex-start;
        }

        .kai-kanban__column {
          flex: 0 0 280px;
          min-width: 280px;
          background: var(--kai-canvas, #FAFAFA);
          border-radius: 12px;
          border: 1px solid var(--kai-border, #E5E7EB);
          display: flex;
          flex-direction: column;
          max-height: calc(100vh - 200px);
        }

        .kai-kanban__col-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px 10px;
          border-bottom: 1px solid var(--kai-border, #E5E7EB);
        }

        .kai-kanban__col-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .kai-kanban__col-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .kai-kanban__col-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--kai-near-black, #10222F);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .kai-kanban__col-count {
          font-size: 11px;
          font-weight: 600;
          color: var(--kai-silver, #4C5963);
          background: var(--kai-border, #E5E7EB);
          border-radius: 10px;
          padding: 1px 8px;
          line-height: 1.4;
        }

        .kai-kanban__drop-zone {
          flex: 1;
          padding: 8px;
          overflow-y: auto;
          min-height: 60px;
          transition: background 0.15s;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .kai-kanban__drop-zone--over {
          background: rgba(20, 109, 247, 0.04);
        }

        .kai-kanban__card {
          background: var(--kai-card-bg, #fff);
          border: 1px solid var(--kai-border, #E5E7EB);
          border-radius: 8px;
          transition: box-shadow 0.15s, transform 0.15s;
          cursor: grab;
        }
        .kai-kanban__card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .kai-kanban__card--dragging {
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          transform: rotate(2deg);
          cursor: grabbing;
        }

        .kai-kanban__card-default {
          padding: 12px;
          font-size: 13px;
          color: var(--kai-near-black, #10222F);
        }

        .kai-kanban__empty {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 12px;
          font-size: 12px;
          color: var(--kai-silver, #4C5963);
          opacity: 0.5;
        }
      `}</style>
    </DragDropContext>
  );
}
