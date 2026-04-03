export interface User {
  id: string
  name: string
  email?: string
  role?: string
  roles?: string[]
  profileImage?: string
}

export interface Attachment {
  name: string
  type: 'image' | 'file'
  url: string
  file?: File
}

export interface Message {
  id: string
  channelId: string
  fromUserId: string
  sender: User
  content: string
  text?: string // Alias for content (backwards compat)
  createdAt: string
  updatedAt?: string | null
  read: boolean
  attachmentUrl?: string | null
  attachment?: Attachment
  replyToId?: string | null
  replyTo?: {
    id: string
    content: string
    fromUserId: string
    sender?: { name: string }
  } | null
  timestamp?: Date // Backwards compat
}

export interface Channel {
  id: string
  name: string | null
  type: 'group' | 'direct'
  description?: string | null
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  participants?: User[]
  participantIds: string[]
  lastMessage?: {
    id: string
    content: string
    createdAt: string
    fromUserId: string
    User?: { name: string }
  } | null
  unreadCount?: number
  icon?: string | File
  organizationId: string
}
