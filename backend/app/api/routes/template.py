"""模板API路由"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.models.schemas import (
    TemplateCreate,
    TemplateUpdate,
    TemplateResponse,
    TemplateVersionResponse,
    TemplateStatus,
    ChartType,
    TemplateParameter,
)
from app.models.database import QueryTemplate, TemplateVersion, DataSource

router = APIRouter(prefix="/templates", tags=["模板管理"])


def _build_template_response(template: QueryTemplate, db: Session) -> TemplateResponse:
    """构建模板响应对象"""
    # 获取数据源名称
    data_source_name = None
    if template.data_source_id:
        ds = db.query(DataSource).filter(DataSource.id == template.data_source_id).first()
        if ds:
            data_source_name = ds.name
    
    # 安全转换图表类型枚举
    default_chart_type = None
    if template.default_chart_type:
        try:
            default_chart_type = ChartType(template.default_chart_type)
        except ValueError:
            # 如果值不在枚举中，使用 None
            default_chart_type = None
    
    # 安全转换状态枚举
    status = TemplateStatus.DRAFT
    if template.status:
        try:
            status = TemplateStatus(template.status)
        except ValueError:
            # 如果值不在枚举中，使用默认值
            status = TemplateStatus.DRAFT
    
    # 转换参数：从数据库的字典列表转换为 TemplateParameter 对象列表
    parameters = []
    if template.parameters:
        for param_dict in template.parameters:
            try:
                # 如果已经是字典，直接创建 TemplateParameter 对象
                if isinstance(param_dict, dict):
                    parameters.append(TemplateParameter(**param_dict))
                else:
                    # 如果已经是 TemplateParameter 对象，直接使用
                    parameters.append(param_dict)
            except Exception:
                # 如果转换失败，跳过该参数
                continue
    
    return TemplateResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        data_source_id=template.data_source_id,
        data_source_name=data_source_name,
        default_chart_type=default_chart_type,
        nl_examples=template.nl_examples or [],
        parameters=parameters,
        default_model_scenario=template.default_model_scenario,
        permission_scope=template.permission_scope,
        status=status,
        version=template.version or 1,
        created_at=template.created_at,
        updated_at=template.updated_at,
        created_by=template.created_by,
    )


def _save_version(template: QueryTemplate, db: Session):
    """保存模板版本快照"""
    snapshot = {
        "name": template.name,
        "description": template.description,
        "data_source_id": template.data_source_id,
        "default_chart_type": template.default_chart_type,
        "nl_examples": template.nl_examples,
        "parameters": template.parameters,
        "default_model_scenario": template.default_model_scenario,
        "permission_scope": template.permission_scope,
        "status": template.status,
    }
    
    version = TemplateVersion(
        template_id=template.id,
        version=template.version,
        snapshot=snapshot,
        created_by=template.created_by,
    )
    db.add(version)


@router.post("", response_model=TemplateResponse)
async def create_template(
    template: TemplateCreate,
    db: Session = Depends(get_db)
):
    """创建模板"""
    # 转换参数为可序列化格式
    parameters = [p.model_dump() for p in template.parameters] if template.parameters else []
    
    db_template = QueryTemplate(
        name=template.name,
        description=template.description,
        data_source_id=template.data_source_id,
        default_chart_type=template.default_chart_type.value if template.default_chart_type else None,
        nl_examples=template.nl_examples or [],
        parameters=parameters,
        default_model_scenario=template.default_model_scenario,
        permission_scope=template.permission_scope,
        status="draft",
        version=1,
    )
    
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    
    # 保存初始版本
    _save_version(db_template, db)
    db.commit()
    
    return _build_template_response(db_template, db)


@router.get("", response_model=List[TemplateResponse])
async def list_templates(
    status: Optional[str] = Query(None, description="按状态筛选"),
    data_source_id: Optional[int] = Query(None, description="按数据源筛选"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """获取模板列表"""
    query = db.query(QueryTemplate)
    
    if status:
        query = query.filter(QueryTemplate.status == status)
    if data_source_id:
        query = query.filter(QueryTemplate.data_source_id == data_source_id)
    
    templates = query.order_by(QueryTemplate.updated_at.desc()).offset(skip).limit(limit).all()
    
    return [_build_template_response(t, db) for t in templates]


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: int,
    db: Session = Depends(get_db)
):
    """获取模板详情"""
    template = db.query(QueryTemplate).filter(QueryTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return _build_template_response(template, db)


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: int,
    update: TemplateUpdate,
    db: Session = Depends(get_db)
):
    """更新模板"""
    template = db.query(QueryTemplate).filter(QueryTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # 更新字段
    if update.name is not None:
        template.name = update.name
    if update.description is not None:
        template.description = update.description
    if update.data_source_id is not None:
        template.data_source_id = update.data_source_id
    if update.default_chart_type is not None:
        template.default_chart_type = update.default_chart_type.value
    if update.nl_examples is not None:
        template.nl_examples = update.nl_examples
    if update.parameters is not None:
        template.parameters = [p.model_dump() for p in update.parameters]
    if update.default_model_scenario is not None:
        template.default_model_scenario = update.default_model_scenario
    if update.permission_scope is not None:
        template.permission_scope = update.permission_scope
    if update.status is not None:
        template.status = update.status.value
    
    # 增加版本号并保存版本快照
    template.version += 1
    _save_version(template, db)
    
    db.commit()
    db.refresh(template)
    
    return _build_template_response(template, db)


@router.delete("/{template_id}")
async def delete_template(
    template_id: int,
    db: Session = Depends(get_db)
):
    """删除模板"""
    template = db.query(QueryTemplate).filter(QueryTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # 删除版本历史
    db.query(TemplateVersion).filter(TemplateVersion.template_id == template_id).delete()
    
    db.delete(template)
    db.commit()
    
    return {"message": "Template deleted successfully"}


@router.post("/{template_id}/publish", response_model=TemplateResponse)
async def publish_template(
    template_id: int,
    db: Session = Depends(get_db)
):
    """发布模板"""
    template = db.query(QueryTemplate).filter(QueryTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template.status = "published"
    db.commit()
    db.refresh(template)
    
    return _build_template_response(template, db)


@router.post("/{template_id}/unpublish", response_model=TemplateResponse)
async def unpublish_template(
    template_id: int,
    db: Session = Depends(get_db)
):
    """下线模板"""
    template = db.query(QueryTemplate).filter(QueryTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template.status = "draft"
    db.commit()
    db.refresh(template)
    
    return _build_template_response(template, db)


@router.post("/{template_id}/duplicate", response_model=TemplateResponse)
async def duplicate_template(
    template_id: int,
    db: Session = Depends(get_db)
):
    """复制模板"""
    template = db.query(QueryTemplate).filter(QueryTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # 创建副本
    new_template = QueryTemplate(
        name=f"{template.name} (副本)",
        description=template.description,
        data_source_id=template.data_source_id,
        default_chart_type=template.default_chart_type,
        nl_examples=template.nl_examples,
        parameters=template.parameters,
        default_model_scenario=template.default_model_scenario,
        permission_scope=template.permission_scope,
        status="draft",
        version=1,
        created_by=template.created_by,
    )
    
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    
    # 保存初始版本
    _save_version(new_template, db)
    db.commit()
    
    return _build_template_response(new_template, db)


@router.get("/{template_id}/versions", response_model=List[TemplateVersionResponse])
async def get_template_versions(
    template_id: int,
    db: Session = Depends(get_db)
):
    """获取模板版本历史"""
    template = db.query(QueryTemplate).filter(QueryTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    versions = db.query(TemplateVersion).filter(
        TemplateVersion.template_id == template_id
    ).order_by(TemplateVersion.version.desc()).all()
    
    return [
        TemplateVersionResponse(
            id=v.id,
            template_id=v.template_id,
            version=v.version,
            snapshot=v.snapshot,
            created_at=v.created_at,
            created_by=v.created_by,
        )
        for v in versions
    ]


@router.post("/{template_id}/rollback/{version_id}", response_model=TemplateResponse)
async def rollback_template(
    template_id: int,
    version_id: int,
    db: Session = Depends(get_db)
):
    """回滚模板到指定版本"""
    template = db.query(QueryTemplate).filter(QueryTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    version = db.query(TemplateVersion).filter(
        TemplateVersion.id == version_id,
        TemplateVersion.template_id == template_id
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # 从快照恢复
    snapshot = version.snapshot
    template.name = snapshot.get("name", template.name)
    template.description = snapshot.get("description")
    template.data_source_id = snapshot.get("data_source_id")
    template.default_chart_type = snapshot.get("default_chart_type")
    template.nl_examples = snapshot.get("nl_examples", [])
    template.parameters = snapshot.get("parameters", [])
    template.default_model_scenario = snapshot.get("default_model_scenario")
    template.permission_scope = snapshot.get("permission_scope")
    
    # 增加版本号并保存新版本
    template.version += 1
    _save_version(template, db)
    
    db.commit()
    db.refresh(template)
    
    return _build_template_response(template, db)

