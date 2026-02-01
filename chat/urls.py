from django.urls import path
from . import views

app_name = 'chat'

urlpatterns = [
    path('', views.chat_view, name='chat'),
    path('conversation/<int:conversation_id>/', views.chat_view, name='conversation'),
    path('send/', views.send_message, name='send_message'),
    path('send/<int:conversation_id>/', views.send_message, name='send_message_to_conversation'),
    path('new/', views.new_conversation, name='new_conversation'),
    path('upload/', views.upload_document, name='upload_document'),
    path('upload-inline/', views.upload_inline_document, name='upload_inline_document'),
    path('link-document/', views.link_document_to_conversation, name='link_document'),
    path('document-status/<int:document_id>/', views.document_status, name='document_status'),
    path('delete/<int:conversation_id>/', views.delete_conversation, name='delete_conversation'),
    path('delete-document/<int:document_id>/', views.delete_document, name='delete_document'),
    path('test-stream/', views.test_stream, name='test_stream'),
]
