<?php

class acf_field_gallery extends acf_field
{

	/*
	*  __construct
	*
	*  Set name / label needed for actions / filters
	*
	*  @since	3.6
	*  @date	23/01/13
	*/
	
	function __construct()
	{
		// vars
		$this->name = 'gallery';
		$this->label = __("Gallery",'acf');
		$this->category = 'content';
		$this->defaults = array(
			'preview_size'	=> 'thumbnail',
			'library'		=> 'all',
			'min'			=> 0,
			'max'			=> 0,
		);
		$this->l10n = array(
			'select'		=>	__("Add Image to Gallery",'acf'),
			'edit'			=>	__("Edit Image",'acf'),
			'update'		=>	__("Update Image",'acf'),
			'uploadedTo'	=>	__("uploaded to this post",'acf'),
			'max'			=>	__("Maximum selection reached",'acf'),
			
			'tmpl'			=> '<div data-id="<%= id %>" class="acf-gallery-attachment">
									<input type="hidden" value="<%= id %>" name="<%= name %>[]">
									<div class="padding">
										<img alt="" src="<%= url %>">
									</div>
								</div>'
		);
		
		
		// ajax
		add_action('wp_ajax_acf/fields/gallery/get_attachment',			array($this, 'ajax_get_attachment'));
		add_action('wp_ajax_nopriv_acf/fields/gallery/get_attachment',	array($this, 'ajax_get_attachment'));
		
		
		add_action('wp_ajax_acf/fields/gallery/update_attachment',		array($this, 'ajax_update_attachment'));
		
		add_action('wp_ajax_acf/fields/gallery/get_sort_order',			array($this, 'ajax_get_sort_order'));
		add_action('wp_ajax_nopriv_acf/fields/gallery/get_sort_order',	array($this, 'ajax_get_sort_order'));
		
		
		
		// do not delete!
    	parent::__construct();
	}
	
	
	/*
	*  ajax_get_attachment
	*
	*  description
	*
	*  @type	function
	*  @date	13/12/2013
	*  @since	5.0.0
	*
	*  @param	$post_id (int)
	*  @return	$post_id (int)
	*/
	
	function ajax_get_attachment() {
	
		// options
   		$options = acf_parse_args( $_GET, array(
			'post_id'					=>	0,
			'id'						=>	0,
			'field_key'					=>	'',
			'nonce'						=>	'',
		));
   		
		
		// validate
		if( ! wp_verify_nonce($options['nonce'], 'acf_nonce') )
		{
			die();
		}
		
		if( ! $options['id'] )
		{
			die();
		}
		
		
		// load field
		$field = acf_get_field( $options['field_key'] );
		
		if( !$field )
		{
			die();
		}
		
		
		// render
		$this->render_attachment( $options['id'], $field );
		die;
		
	}
	
	
	/*
	*  ajax_update_attachment
	*
	*  description
	*
	*  @type	function
	*  @date	13/12/2013
	*  @since	5.0.0
	*
	*  @param	$post_id (int)
	*  @return	$post_id (int)
	*/
	
	function ajax_update_attachment() {
		
		// validate
		if( ! wp_verify_nonce($_REQUEST['nonce'], 'acf_nonce') )
		{
			wp_send_json_error();
		}
		
		
		if( empty($_REQUEST['attachments']) )
		{
			wp_send_json_error();
		}
		
		foreach( $_REQUEST['attachments'] as $id => $changes )
		{
			if ( ! current_user_can( 'edit_post', $id ) )
				wp_send_json_error();
				
			$post    = get_post( $id, ARRAY_A );
		
			if ( 'attachment' != $post['post_type'] )
				wp_send_json_error();
		
			if ( isset( $changes['title'] ) )
				$post['post_title'] = $changes['title'];
		
			if ( isset( $changes['caption'] ) )
				$post['post_excerpt'] = $changes['caption'];
		
			if ( isset( $changes['description'] ) )
				$post['post_content'] = $changes['description'];
		
			if ( isset( $changes['alt'] ) ) {
				$alt = wp_unslash( $changes['alt'] );
				if ( $alt != get_post_meta( $id, '_wp_attachment_image_alt', true ) ) {
					$alt = wp_strip_all_tags( $alt, true );
					update_post_meta( $id, '_wp_attachment_image_alt', wp_slash( $alt ) );
				}
			}
		
			wp_update_post( $post );
			
						
		}
		
		wp_send_json_success();
			
	}
	
	
	/*
	*  ajax_get_sort_order
	*
	*  description
	*
	*  @type	function
	*  @date	13/12/2013
	*  @since	5.0.0
	*
	*  @param	$post_id (int)
	*  @return	$post_id (int)
	*/
	
	function ajax_get_sort_order() {
		
		// options
		$r = array();
   		$args = acf_parse_args( $_REQUEST, array(
			'ids'			=>	0,
			'sort'			=>	'date',
			'field_key'		=>	'',
			'nonce'			=>	'',
		));
		
		
		// validate
		if( ! wp_verify_nonce($args['nonce'], 'acf_nonce') )
		{
			wp_send_json_error();
		}
		
		
		// reverse
		if( $args['sort'] == 'reverse' )
		{
			$ids = array_reverse($args['ids']);
			
			wp_send_json_success($ids);
		}
		
		
		// find attachments (DISTINCT POSTS)
		$ids = get_posts(array(
			'post_type'		=> 'attachment',
			'numberposts'	=> -1,
			'post_status'	=> 'any',
			'post__in'		=> $args['ids'],
			'order'			=> 'DESC',
			'orderby'		=> $args['sort'],
			'fields'		=> 'ids'		
		));
		
		
		if( !empty($ids) )
		{
			wp_send_json_success($ids);
		}
		
		wp_send_json_error();
		
	}
	
	
	/*
	*  render_attachment
	*
	*  description
	*
	*  @type	function
	*  @date	13/12/2013
	*  @since	5.0.0
	*
	*  @param	$post_id (int)
	*  @return	$post_id (int)
	*/
	
	function render_attachment( $id = 0, $field ) {
		
		$attachment = wp_prepare_attachment_for_js( $id );
		$prefix = "attachments[{$id}]";
		
		?>
		<div class="acf-gallery-side-info">
			<p class="filename"><strong><?php echo $attachment['title']; ?></strong></p>
			<p class="uploaded"><?php echo $attachment['dateFormatted']; ?></p>
			<p class="dimensions"><?php echo $attachment['width']; ?> × <?php echo $attachment['height']; ?></p>
			<p>
				<a target="_blank" href="#" >Edit</a> 
				<a href="#" class="remove-attachment" data-name="remove-attachment-button" data-id="<?php echo $id; ?>">Remove</a>
			</p>
		</div>
		<table class="form-table">
			<tbody>
				<?php 
				
				acf_render_field_wrap(array(
					//'key'		=> "{$field['key']}-title",
					'name'		=> 'title',
					'prefix'	=> $prefix,
					'type'		=> 'text',
					'label'		=> 'Title',
					'value'		=> $attachment['title']
				), 'tr');
				
				acf_render_field_wrap(array(
					//'key'		=> "{$field['key']}-caption",
					'name'		=> 'caption',
					'prefix'	=> $prefix,
					'type'		=> 'textarea',
					'label'		=> 'Caption',
					'value'		=> $attachment['caption']
				), 'tr');
				
				acf_render_field_wrap(array(
					//'key'		=> "{$field['key']}-alt",
					'name'		=> 'alt',
					'prefix'	=> $prefix,
					'type'		=> 'text',
					'label'		=> 'Alt Text',
					'value'		=> $attachment['alt']
				), 'tr');
				
				acf_render_field_wrap(array(
					//'key'		=> "{$field['key']}-description",
					'name'		=> 'description',
					'prefix'	=> $prefix,
					'type'		=> 'textarea',
					'label'		=> 'Description',
					'value'		=> $attachment['description']
				), 'tr');
				
				?>
			</tbody>
		</table>
		<?php
	}
	
	
	/*
	*  render_field()
	*
	*  Create the HTML interface for your field
	*
	*  @param	$field - an array holding all the field's data
	*
	*  @type	action
	*  @since	3.6
	*  @date	23/01/13
	*/
	
	function render_field( $field ) {
		
		// vars
		$atts = array(
			'id'				=> $field['id'],
			'class'				=> "acf-gallery {$field['class']}",
			'data-preview_size'	=> $field['preview_size'],
			'data-library'		=> $field['library'],
			'data-min'			=> $field['min'],
			'data-max'			=> $field['max'],
		);
		
		?>
<div <?php acf_esc_attr_e($atts); ?>>
	
	<div class="acf-hidden">
		<input type="hidden" <?php acf_esc_attr_e(array( 'name' => $field['name'], 'value' => '', 'data-name' => 'ids' )); ?> />
	</div>
	
	<div class="acf-gallery-main">
		
		<div class="acf-gallery-attachments">
			
			<?php if( !empty($field['value']) ): ?>
				
				<?php foreach( $field['value'] as $id ): 
					
					// vars
					$mime_type = get_post_mime_type( $id );
					$src = '';
	
					if( strpos($mime_type, 'image') !== false )
					{
						$src = wp_get_attachment_image_src( $id, $field['preview_size'] );
						$src = $src[0];
					}
					else
					{
						$src = wp_mime_type_icon( $id );
					}
					
					?>
					
					<div class="acf-gallery-attachment" data-id="<?php echo $id; ?>">
						<input type="hidden" name="<?php echo $field['name']; ?>[]" value="<?php echo $id; ?>" />
						<div class="padding">
							<img src="<?php echo $src; ?>" alt="" />
						</div>
					</div>
					
				<?php endforeach; ?>
				
			<?php endif; ?>
			
			
		</div>
		
		<div class="acf-gallery-toolbar">
			
			<ul class="acf-hl">
				<li>
					<a data-name="add-attachment-button" class="acf-button blue">Add to gallery</a>
				</li>
				<li class="acf-fr">
					<select data-name="bulk-actions-select">
						<option value="">Bulk actions</option>
						<option value="date">Sort by date uploaded</option>
						<option value="modified">Sort by date modified</option>
						<option value="title">Sort by title</option>
						<option value="reverse">Reverse current order</option>
					</select>
					<!-- <a class="acf-button bulk-actions-apply">Apply</a> -->
				</li>
			</ul>
			
		</div>
		
	</div>
	
	<div class="acf-gallery-side">
	<div class="acf-gallery-side-inner">
			
		<div class="acf-gallery-side-data">
		
			<?php //echo get_media_item( 158 ); ?>
			
		</div>
						
		<div class="acf-gallery-toolbar">
			
			<ul class="acf-hl">
				<li>
					<a data-name="close-attachment-button" class="acf-button">Close</a>
				</li>
				<li class="acf-fr">
					<a data-name="save-attachment-button" class="acf-button blue">Update</a>
				</li>
			</ul>
			
		</div>
		
	</div>	
	</div>
	
</div>
		<?php
		
	}
	
	
	/*
	*  render_field_options()
	*
	*  Create extra options for your field. This is rendered when editing a field.
	*  The value of $field['name'] can be used (like bellow) to save extra data to the $field
	*
	*  @type	action
	*  @since	3.6
	*  @date	23/01/13
	*
	*  @param	$field	- an array holding all the field's data
	*/
	
	function render_field_options( $field ) {
		
		// min / max
		$field['min'] = empty($field['min']) ? '' : $field['min'];
		$field['max'] = empty($field['max']) ? '' : $field['max'];
		
		
		// min
		acf_render_field_option( $this->name, array(
			'label'			=> __('Minimum Selection','acf'),
			'instructions'	=> '',
			'type'			=> 'number',
			'name'			=> 'min',
			'prefix'		=> $field['prefix'],
			'value'			=> $field['min'],
			'placeholder'	=> '0',
		));
		
		
		// max
		acf_render_field_option( $this->name, array(
			'label'			=> __('Maximum Selection','acf'),
			'instructions'	=> '',
			'type'			=> 'number',
			'name'			=> 'max',
			'prefix'		=> $field['prefix'],
			'value'			=> $field['max'],
			'placeholder'	=> '0',
		));
		
		
		// preview_size
		acf_render_field_option( $this->name, array(
			'label'			=> __('Preview Size','acf'),
			'instructions'	=> __('Shown when entering data','acf'),
			'type'			=> 'radio',
			'name'			=> 'preview_size',
			'prefix'		=> $field['prefix'],
			'value'			=> $field['preview_size'],
			'layout'		=> 'horizontal',
			'choices'		=> acf_get_image_sizes()
		));
		
		
		// library
		acf_render_field_option( $this->name, array(
			'label'			=> __('Library','acf'),
			'instructions'	=> __('Limit the media library choice','acf'),
			'type'			=> 'radio',
			'name'			=> 'library',
			'prefix'		=> $field['prefix'],
			'value'			=> $field['library'],
			'layout'		=> 'horizontal',
			'choices' 		=> array(
				'all'			=> __('All', 'acf'),
				'uploadedTo'	=> __('Uploaded to post', 'acf')
			)
		));
		
	}
	
	
	/*
	*  format_value()
	*
	*  This filter is appied to the $value after it is loaded from the db and before it is passed to the render_field action
	*
	*  @type	filter
	*  @since	3.6
	*  @date	23/01/13
	*
	*  @param	$value (mixed) the value which was loaded from the database
	*  @param	$post_id (mixed) the $post_id from which the value was loaded
	*  @param	$field (array) the field array holding all the field options
	*  @param	$template (boolean) true if value requires formatting for front end template function
	*
	*  @return	$value (mixed) the modified value
	*/
	
	function format_value( $value, $post_id, $field, $template ) {
		
		// bail early if no value
		if( empty($value) )
		{
			return $value;
		}
		
		
		// bail early if not formatting for template use
		if( !$template )
		{
			return $value;
		}
		
		
		// return
		return $value;
	}
	
	
	/*
	*  validate_value
	*
	*  description
	*
	*  @type	function
	*  @date	11/02/2014
	*  @since	5.0.0
	*
	*  @param	$post_id (int)
	*  @return	$post_id (int)
	*/
	
	function validate_value( $valid, $value, $field, $input ){
		
		if( empty($value) || !is_array($value) )
		{
			$value = array();
		}
		
		
		if( count($value) < $field['min'] )
		{
			$valid = _n( '%s requires at least %s selection', '%s requires at least %s selections', $field['min'], 'acf' );
			$valid = sprintf( $valid, $field['label'], $field['min'] );
		}
		
				
		return $valid;
		
	}

	
}

new acf_field_gallery();

?>