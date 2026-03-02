"""Agent对话API路由"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.models.database import ChatMessage, ChatSession
from app.models.schemas import (
    ChatMessageResponse,
    ChatMessageRole,
    ChatMessageType,
    ChatSendMessage,
    ChatSessionCreate,
    ChatSessionListItem,
    ChatSessionResponse,
)
from app.services.agent_chat import AgentChatService

router = APIRouter(prefix="/chat", tags=["Agent对话"])


@router.post("/sessions", response_model=ChatSessionResponse)
async def create_session(
    req: ChatSessionCreate,
    db: Session = Depends(get_db),
):
    """创建新对话会话"""
    session = ChatSession(
        title=req.title or "新对话",
        data_source_id=req.data_source_id,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return ChatSessionResponse(
        id=session.id,
        title=session.title,
        data_source_id=session.data_source_id,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=[],
    )


@router.get("/sessions", response_model=List[ChatSessionListItem])
async def list_sessions(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """获取会话列表"""
    sessions = (
        db.query(ChatSession)
        .order_by(ChatSession.updated_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    result = []
    for s in sessions:
        msg_count = (
            db.query(sa_func.count(ChatMessage.id))
            .filter(ChatMessage.session_id == s.id)
            .scalar()
        )
        last_msg = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == s.id)
            .order_by(ChatMessage.id.desc())
            .first()
        )
        result.append(
            ChatSessionListItem(
                id=s.id,
                title=s.title,
                data_source_id=s.data_source_id,
                created_at=s.created_at,
                updated_at=s.updated_at,
                message_count=msg_count or 0,
                last_message=last_msg.content[:80] if last_msg else None,
            )
        )
    return result


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_session(
    session_id: int,
    db: Session = Depends(get_db),
):
    """获取会话详情（含消息历史）"""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.id.asc())
        .all()
    )

    return ChatSessionResponse(
        id=session.id,
        title=session.title,
        data_source_id=session.data_source_id,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=[
            ChatMessageResponse(
                id=m.id,
                session_id=m.session_id,
                role=ChatMessageRole(m.role),
                content=m.content,
                message_type=ChatMessageType(m.message_type),
                chart_type=m.chart_type,
                chart_option=m.chart_option,
                table_data=m.table_data,
                table_columns=m.table_columns,
                generated_sql=m.generated_sql,
                plan_data=m.plan_data,
                created_at=m.created_at,
            )
            for m in messages
        ],
    )


@router.post("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def send_message(
    session_id: int,
    req: ChatSendMessage,
    db: Session = Depends(get_db),
):
    """发送消息到会话"""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    if req.data_source_id and req.data_source_id != session.data_source_id:
        session.data_source_id = req.data_source_id
        db.commit()

    service = AgentChatService(db)
    try:
        all_msgs = await service.process_message(
            session_id=session_id,
            user_content=req.content,
            data_source_id=req.data_source_id or session.data_source_id,
        )
    except Exception as e:
        logger.error(f"处理消息失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"处理消息失败: {str(e)}")

    return [
        ChatMessageResponse(
            id=m.id,
            session_id=m.session_id,
            role=ChatMessageRole(m.role),
            content=m.content,
            message_type=ChatMessageType(m.message_type),
            chart_type=m.chart_type,
            chart_option=m.chart_option,
            table_data=m.table_data,
            table_columns=m.table_columns,
            generated_sql=m.generated_sql,
            plan_data=m.plan_data,
            created_at=m.created_at,
        )
        for m in all_msgs
    ]


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
):
    """删除会话"""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.delete(session)
    db.commit()

    return {"message": "会话已删除"}


@router.put("/sessions/{session_id}")
async def update_session(
    session_id: int,
    req: ChatSessionCreate,
    db: Session = Depends(get_db),
):
    """更新会话信息"""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    if req.title:
        session.title = req.title
    if req.data_source_id is not None:
        session.data_source_id = req.data_source_id
    db.commit()
    db.refresh(session)

    return ChatSessionResponse(
        id=session.id,
        title=session.title,
        data_source_id=session.data_source_id,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=[],
    )
