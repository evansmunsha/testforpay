// components/jobs/task-template-selector.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { TASK_TEMPLATES, type TaskTemplateKey } from '@/lib/constants'
import { Check, Edit3, Target } from 'lucide-react'

interface TaskTemplateSelectorProps {
  selectedTemplate: string | null
  customTasks: string[]
  onTemplateSelect: (key: string) => void
  onCustomTasksChange: (tasks: string[]) => void
}

const TEMPLATE_LABELS: Record<TaskTemplateKey, string> = {
  generic: 'Generic',
  invoice: 'Invoice App',
}

const TEMPLATE_DESCRIPTIONS: Record<TaskTemplateKey, string> = {
  generic: 'Works for any app type',
  invoice: 'Tailored for billing/invoice apps',
}

export function TaskTemplateSelector({
  selectedTemplate,
  customTasks,
  onTemplateSelect,
  onCustomTasksChange,
}: TaskTemplateSelectorProps) {
  const [mode, setMode] = useState<'template' | 'custom'>(
    selectedTemplate ? 'template' : 'custom'
  )
  const [editingTask, setEditingTask] = useState<number | null>(null)
  const [editText, setEditText] = useState('')

  const templates = Object.entries(TASK_TEMPLATES) as [TaskTemplateKey, readonly string[]][]

  const handleTemplateSelect = (key: TaskTemplateKey) => {
    onTemplateSelect(key)
    onCustomTasksChange([...TASK_TEMPLATES[key]])
    setMode('custom')
  }

  const handleEdit = (index: number, currentText: string) => {
    setEditingTask(index)
    setEditText(currentText)
  }

  const handleSaveEdit = (index: number) => {
    const updated = [...customTasks]
    updated[index] = editText.trim() || customTasks[index]
    onCustomTasksChange(updated)
    setEditingTask(null)
  }

  const handleCancelEdit = () => {
    setEditingTask(null)
    setEditText('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-blue-600" />
        <h3 className="text-base font-semibold">Daily Missions</h3>
        <Badge variant="secondary" className="text-xs">Optional</Badge>
      </div>
      <p className="text-sm text-gray-500">
        Define a specific task for testers to complete each day. Pre-filled missions improve tester
        engagement and provide structured feedback over the 14-day period.
      </p>

      {mode === 'template' && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map(([key, tasks]) => (
              <Card
                key={key}
                className={`cursor-pointer transition-all hover:border-blue-300 ${
                  selectedTemplate === key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
                onClick={() => handleTemplateSelect(key)}
              >
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{TEMPLATE_LABELS[key]}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{TEMPLATE_DESCRIPTIONS[key]}</p>
                    <p className="text-xs text-gray-400 mt-1">{tasks.length} days pre-filled</p>
                  </div>
                  {selectedTemplate === key ? (
                    <Check className="h-5 w-5 text-blue-600 shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300 shrink-0" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onCustomTasksChange([...TASK_TEMPLATES.generic])
              onTemplateSelect('generic')
              setMode('custom')
            }}
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Start from Generic &amp; Edit
          </Button>
        </div>
      )}

      {mode === 'custom' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {customTasks.length} / 14 days configured
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setMode('template')}
            >
              Use a Template Instead
            </Button>
          </div>

          <div className="space-y-2">
            {customTasks.map((task, index) => (
              <Card key={index} className="border-gray-200">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-normal flex items-start gap-3">
                    <Badge
                      variant="outline"
                      className="text-xs shrink-0 mt-0.5"
                    >
                      Day {index + 1}
                    </Badge>

                    {editingTask === index ? (
                      <div className="flex-1 flex flex-col gap-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-[60px] text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSaveEdit(index)}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-gray-700 leading-relaxed">
                          {task}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 h-6 w-6 p-0"
                          onClick={() => handleEdit(index, task)}
                        >
                          <Edit3 className="h-3 w-3" />
                          <span className="sr-only">Edit day {index + 1}</span>
                        </Button>
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
