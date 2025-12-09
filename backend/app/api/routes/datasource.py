"""数据源API路由"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from loguru import logger

from app.api.dependencies import get_db
from app.models.schemas import (
    DataSourceCreate, DataSourceUpdate, DataSourceResponse
)
from app.models.database import DataSource
from app.connectors.base import ConnectorFactory
from app.models.schemas import DataSourceType
from app.utils.encryption import get_encryption_manager

router = APIRouter(prefix="/datasources", tags=["数据源"])


@router.post("", response_model=DataSourceResponse)
async def create_datasource(
    datasource: DataSourceCreate,
    db: Session = Depends(get_db)
):
    """创建数据源"""
    # 加密连接信息
    encryption_manager = get_encryption_manager()
    encrypted_info = {
        k: encryption_manager.encrypt(str(v)) if isinstance(v, str) else v
        for k, v in datasource.connection_info.items()
    }
    
    db_datasource = DataSource(
        name=datasource.name,
        type=datasource.type.value,
        description=datasource.description,
        connection_info=encrypted_info,
        timeout=datasource.timeout,
        max_rows=datasource.max_rows,
        status="inactive"
    )
    
    db.add(db_datasource)
    db.commit()
    db.refresh(db_datasource)
    
    return DataSourceResponse(
        id=db_datasource.id,
        name=db_datasource.name,
        type=DataSourceType(db_datasource.type),
        description=db_datasource.description,
        connection_info=datasource.connection_info,  # 返回未加密的（仅用于测试）
        timeout=db_datasource.timeout,
        max_rows=db_datasource.max_rows,
        status=db_datasource.status,
        created_at=db_datasource.created_at,
        updated_at=db_datasource.updated_at,
        created_by=db_datasource.created_by
    )


@router.get("", response_model=List[DataSourceResponse])
async def list_datasources(
    db: Session = Depends(get_db)
):
    """获取数据源列表"""
    datasources = db.query(DataSource).all()
    result = []
    encryption_manager = get_encryption_manager()
    
    for ds in datasources:
        # 解密连接信息（兼容已加密和未加密的数据）
        decrypted_info = {}
        if ds.connection_info:
            for k, v in ds.connection_info.items():
                if isinstance(v, str):
                    try:
                        decrypted_info[k] = encryption_manager.decrypt(v)
                    except:
                        # 解密失败，可能是未加密的数据，直接使用原值
                        decrypted_info[k] = v
                else:
                    decrypted_info[k] = v
        
        result.append(DataSourceResponse(
            id=ds.id,
            name=ds.name,
            type=DataSourceType(ds.type),
            description=ds.description,
            connection_info=decrypted_info,
            timeout=ds.timeout,
            max_rows=ds.max_rows,
            status=ds.status,
            created_at=ds.created_at,
            updated_at=ds.updated_at,
            created_by=ds.created_by
        ))
    
    return result


@router.get("/{datasource_id}", response_model=DataSourceResponse)
async def get_datasource(
    datasource_id: int,
    db: Session = Depends(get_db)
):
    """获取数据源详情"""
    datasource = db.query(DataSource).filter(DataSource.id == datasource_id).first()
    if not datasource:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    encryption_manager = get_encryption_manager()
    decrypted_info = {}
    if datasource.connection_info:
        for k, v in datasource.connection_info.items():
            if isinstance(v, str):
                try:
                    decrypted_info[k] = encryption_manager.decrypt(v)
                except:
                    # 解密失败，可能是未加密的数据，直接使用原值
                    decrypted_info[k] = v
            else:
                decrypted_info[k] = v
    
    return DataSourceResponse(
        id=datasource.id,
        name=datasource.name,
        type=DataSourceType(datasource.type),
        description=datasource.description,
        connection_info=decrypted_info,
        timeout=datasource.timeout,
        max_rows=datasource.max_rows,
        status=datasource.status,
        created_at=datasource.created_at,
        updated_at=datasource.updated_at,
        created_by=datasource.created_by
    )


@router.post("/{datasource_id}/test")
async def test_datasource(
    datasource_id: int,
    db: Session = Depends(get_db)
):
    """测试数据源连接"""
    logger.info(f"开始测试数据源连接，数据源ID: {datasource_id}")
    
    datasource = db.query(DataSource).filter(DataSource.id == datasource_id).first()
    if not datasource:
        logger.warning(f"数据源不存在，ID: {datasource_id}")
        raise HTTPException(status_code=404, detail="Data source not found")
    
    logger.info(f"找到数据源: {datasource.name}, 类型: {datasource.type}, 状态: {datasource.status}")
    
    # 解密连接信息（兼容已加密和未加密的数据）
    try:
        encryption_manager = get_encryption_manager()
        connection_info = {}
        if datasource.connection_info:
            logger.debug(f"开始处理连接信息，字段数: {len(datasource.connection_info)}")
            for k, v in datasource.connection_info.items():
                if isinstance(v, str):
                    # 尝试解密，如果失败则假设是未加密的数据，直接使用
                    try:
                        decrypted = encryption_manager.decrypt(v)
                        connection_info[k] = decrypted
                        logger.debug(f"成功解密字段: {k}")
                    except Exception as decrypt_error:
                        # 解密失败，可能是未加密的数据，直接使用原值
                        logger.debug(f"字段 {k} 解密失败，使用原值（可能是未加密数据）: {str(decrypt_error)}")
                        connection_info[k] = v
                else:
                    connection_info[k] = v
                    logger.debug(f"字段 {k} 无需处理，值类型: {type(v)}")
        
        # 隐藏敏感信息后记录连接信息
        safe_connection_info = {k: "***" if k in ["password", "token", "secret"] else v 
                               for k, v in connection_info.items()}
        logger.info(f"连接信息处理完成: {safe_connection_info}")
    except Exception as e:
        logger.error(f"处理连接信息时发生未知错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process connection info: {str(e)}")
    
    # 测试连接
    try:
        logger.info(f"创建连接器，类型: {datasource.type}")
        connector = ConnectorFactory.create(
            DataSourceType(datasource.type),
            connection_info,
            timeout=datasource.timeout,
            max_rows=datasource.max_rows
        )
        logger.info(f"连接器创建成功，开始测试连接...")
        
        # test_connection 成功会返回 True，失败会抛出异常
        success = connector.test_connection()
        logger.info(f"连接测试成功: {success}")
        
        # 更新状态为 active（如果到达这里说明连接成功）
        datasource.status = "active"
        db.commit()
        logger.info(f"数据源状态已更新为 active")
        
        return {"success": True, "message": "Connection test successful"}
    except HTTPException:
        # 重新抛出 HTTP 异常
        raise
    except ValueError as e:
        # 连接器类型不支持
        logger.error(f"不支持的连接器类型: {str(e)}")
        datasource.status = "error"
        db.commit()
        raise HTTPException(status_code=400, detail=f"Unsupported data source type: {str(e)}")
    except ConnectionError as e:
        # 连接错误
        logger.error(f"连接测试失败 (ConnectionError): {str(e)}", exc_info=True)
        datasource.status = "error"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Connection test failed: {str(e)}")
    except Exception as e:
        # 其他异常
        logger.error(f"连接测试时发生未知错误: {str(e)}", exc_info=True)
        datasource.status = "error"
        db.commit()
        error_detail = str(e)
        error_type = type(e).__name__
        raise HTTPException(
            status_code=500, 
            detail=f"Connection test failed ({error_type}): {error_detail}"
        )


@router.put("/{datasource_id}", response_model=DataSourceResponse)
async def update_datasource(
    datasource_id: int,
    update: DataSourceUpdate,
    db: Session = Depends(get_db)
):
    """更新数据源"""
    datasource = db.query(DataSource).filter(DataSource.id == datasource_id).first()
    if not datasource:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    if update.name is not None:
        datasource.name = update.name
    if update.description is not None:
        datasource.description = update.description
    if update.connection_info is not None:
        encryption_manager = get_encryption_manager()
        encrypted_info = {
            k: encryption_manager.encrypt(str(v)) if isinstance(v, str) else v
            for k, v in update.connection_info.items()
        }
        datasource.connection_info = encrypted_info
    if update.timeout is not None:
        datasource.timeout = update.timeout
    if update.max_rows is not None:
        datasource.max_rows = update.max_rows
    
    db.commit()
    db.refresh(datasource)
    
    return DataSourceResponse(
        id=datasource.id,
        name=datasource.name,
        type=DataSourceType(datasource.type),
        description=datasource.description,
        connection_info=update.connection_info or {},
        timeout=datasource.timeout,
        max_rows=datasource.max_rows,
        status=datasource.status,
        created_at=datasource.created_at,
        updated_at=datasource.updated_at,
        created_by=datasource.created_by
    )


@router.delete("/{datasource_id}")
async def delete_datasource(
    datasource_id: int,
    db: Session = Depends(get_db)
):
    """删除数据源"""
    datasource = db.query(DataSource).filter(DataSource.id == datasource_id).first()
    if not datasource:
        raise HTTPException(status_code=404, detail="Data source not found")
    
    db.delete(datasource)
    db.commit()
    
    return {"message": "Data source deleted successfully"}
