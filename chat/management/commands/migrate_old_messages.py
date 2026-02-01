from django.core.management.base import BaseCommand
from chat.models import ChatMessage, Conversation

class Command(BaseCommand):
    help = 'Migrate old chat messages to conversations'

    def handle(self, *args, **options):
        # Get all messages without a conversation
        orphaned_messages = ChatMessage.objects.filter(conversation__isnull=True)
        
        if not orphaned_messages.exists():
            self.stdout.write(self.style.SUCCESS('No orphaned messages found!'))
            return
        
        # Group by user
        users = orphaned_messages.values_list('user', flat=True).distinct()
        
        for user_id in users:
            user_messages = orphaned_messages.filter(user_id=user_id).order_by('timestamp')
            
            if user_messages.exists():
                # Create a conversation for old messages
                first_message = user_messages.first()
                conversation = Conversation.objects.create(
                    user_id=user_id,
                    title=f"Old Chat - {first_message.timestamp.strftime('%Y-%m-%d')}",
                    chat_type='general'
                )
                
                # Assign all user messages to this conversation
                user_messages.update(conversation=conversation)
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Migrated {user_messages.count()} messages for user {user_id}'
                    )
                )
        
        self.stdout.write(self.style.SUCCESS('Migration complete!'))
